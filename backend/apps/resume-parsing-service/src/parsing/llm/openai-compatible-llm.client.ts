import { Injectable, Logger } from '@nestjs/common';
import { ParseException } from '../../common/errors/parse.exception';
import { ExtractionOutput } from '../extraction/extraction.port';
import { SYSTEM_PROMPT, buildScannedDocumentPrompt, buildUserPrompt } from './prompt';
import { LlmCallInput, LlmCallOutput, LlmClient } from './llm-client.port';

type FallbackProvider = {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Per-request completion cap. Groq's free tier rejects >4096 with a 413. */
  maxTokens: number;
};

/**
 * Ordered fallback chain of OpenAI-compatible providers, tried after the
 * primary (Gemini) has exhausted its own retries. Groq first because it is the
 * fastest free option — the wait is already the main complaint — then Hugging
 * Face as backup.
 *
 * Each link self-enables only when its key is present, so with no keys set no
 * request is ever issued and this costs nothing. Anthropic is deliberately not
 * in the chain: cost.
 *
 *   GROQ_API_KEY            [+ GROQ_MODEL]
 *   XAI_API_KEY             [+ XAI_MODEL]     - Grok; needs team credits
 *   HUGGINGFACE_API_KEY     [+ HUGGINGFACE_MODEL]
 *   OLLAMA_FALLBACK_ENABLED [+ OLLAMA_MODEL]  - local, keyless, last resort.
 *     Off by default: loading a large local model competes for RAM on the dev
 *     machine, so it is opt-in rather than silently enabled.
 *
 * Plain fetch — no SDK dependency added.
 */
@Injectable()
export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly logger = new Logger(OpenAiCompatibleLlmClient.name);
  private readonly timeoutMs = parseInt(
    process.env.LLM_FALLBACK_TIMEOUT_MS || '45000',
    10,
  );

  private get providers(): FallbackProvider[] {
    const groqKey = process.env.GROQ_API_KEY || '';
    const groqUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const groqMax = parseInt(process.env.GROQ_MAX_TOKENS || '4096', 10);
    const hfKey = process.env.HUGGINGFACE_API_KEY || '';
    const hfUrl =
      process.env.HUGGINGFACE_BASE_URL || 'https://router.huggingface.co/v1';
    const hfMax = parseInt(process.env.HUGGINGFACE_MAX_TOKENS || '16384', 10);

    // Order is measured, not assumed: all of these scored 14/14 on extraction
    // quality against the same resume, so they are ranked by latency.
    // Two Groq models are listed so a single rate-limited model does not drop
    // the whole request down to a provider that is ~8x slower.
    return [
      // 0.9s
      { name: 'groq:qwen3.8-27b', apiKey: groqKey, baseUrl: groqUrl,
        model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b', maxTokens: groqMax },
      // 1.9s
      { name: 'groq:gpt-oss-120b', apiKey: groqKey, baseUrl: groqUrl,
        model: process.env.GROQ_MODEL_2 || 'openai/gpt-oss-120b', maxTokens: groqMax },
      // 7.9s
      { name: 'hf:llama-3.3-70b', apiKey: hfKey, baseUrl: hfUrl,
        model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
        maxTokens: hfMax },
      // 22.5s
      { name: 'hf:qwen2.5-72b', apiKey: hfKey, baseUrl: hfUrl,
        model: process.env.HUGGINGFACE_MODEL_2 || 'Qwen/Qwen2.5-72B-Instruct',
        maxTokens: hfMax },
      // needs team credits; 403s until funded
      { name: 'xai:grok', apiKey: process.env.XAI_API_KEY || '',
        baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
        model: process.env.XAI_MODEL || 'grok-4-fast-non-reasoning',
        maxTokens: parseInt(process.env.XAI_MAX_TOKENS || '16384', 10) },
      // local, keyless, opt-in (loads a large model into RAM)
      { name: 'ollama', apiKey: process.env.OLLAMA_FALLBACK_ENABLED === 'true' ? 'local' : '',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
        maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '16384', 10) },
    ].filter((p) => Boolean(p.apiKey));
  }

  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  async call(input: LlmCallInput): Promise<LlmCallOutput> {
    const chain = this.providers;
    if (!chain.length) throw ParseException.modelUnavailable();

    let lastError: Error | null = null;
    for (const provider of chain) {
      try {
        const result = await this.callProvider(provider, input);
        this.logger.log(`Fallback provider ${provider.name} succeeded`);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Fallback provider ${provider.name} failed: ${lastError.message}`,
        );
      }
    }
    throw lastError ?? ParseException.modelUnavailable();
  }

  private async callProvider(
    provider: FallbackProvider,
    input: LlmCallInput,
  ): Promise<LlmCallOutput> {
    const userPrompt = input.isNearEmpty
      ? buildScannedDocumentPrompt()
      : buildUserPrompt(input.text);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0,
          max_tokens: provider.maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`responded ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error('no text content in response');

      return {
        result: this.parseModelResponse(text),
        attempts: 1,
        detectedLanguages: [],
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('abort')) throw new Error('timed out');
      throw new Error(message);
    }
  }

  // Providers vary in how they honour the schema: Gemini returns
  // skills as [{name}], while gpt-oss/llama often return plain strings.
  // Normalise so downstream code sees one shape regardless of who answered.
  private normalise(raw: any): ExtractionOutput {
    const toNamed = (v: any) =>
      Array.isArray(v)
        ? v
            .map((item) =>
              typeof item === 'string'
                ? { name: item }
                : item && typeof item === 'object'
                  ? { ...item, name: item.name ?? item.skill ?? item.title ?? '' }
                  : null,
            )
            .filter((item) => item && item.name)
        : [];

    if (raw && typeof raw === 'object') {
      if (raw.skills) raw.skills = toNamed(raw.skills);
      if (raw.industries) {
        raw.industries = Array.isArray(raw.industries)
          ? raw.industries.map((i: any) => (typeof i === 'string' ? i : i?.name)).filter(Boolean)
          : [];
      }
      if (raw.certifications) {
        raw.certifications = Array.isArray(raw.certifications)
          ? raw.certifications
              .map((c: any) =>
                typeof c === 'string'
                  ? { name: c, issuing_body: null }
                  : { ...c, name: c?.name ?? '', issuing_body: c?.issuing_body ?? c?.issuer ?? null },
              )
              .filter((c: any) => c.name)
          : [];
      }
      if (Array.isArray(raw.education)) {
        raw.education = raw.education.map((e: any) => ({
          ...e,
          institution: e?.institution ?? e?.school ?? null,
          field_of_study: e?.field_of_study ?? e?.fieldOfStudy ?? null,
        }));
      }
      if (Array.isArray(raw.work_experience)) {
        raw.work_experience = raw.work_experience.map((w: any) => ({
          ...w,
          job_title: w?.job_title ?? w?.title ?? null,
        }));
      }
    }
    return raw as ExtractionOutput;
  }

  // Same tolerance as the primary client: models often wrap JSON in fences.
  private parseModelResponse(text: string): ExtractionOutput {
    let jsonStr = text.trim();
    const fenced = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenced) jsonStr = fenced[1].trim();
    try {
      return this.normalise(JSON.parse(jsonStr));
    } catch {
      const first = jsonStr.indexOf('{');
      const last = jsonStr.lastIndexOf('}');
      if (first !== -1 && last > first) {
        return this.normalise(JSON.parse(jsonStr.slice(first, last + 1)));
      }
      throw new Error('returned unparseable JSON');
    }
  }
}
