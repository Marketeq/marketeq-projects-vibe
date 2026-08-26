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
    return [
      {
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      },
      {
        name: 'xai',
        apiKey: process.env.XAI_API_KEY || '',
        baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
        model: process.env.XAI_MODEL || 'grok-4-fast-non-reasoning',
      },
      {
        name: 'huggingface',
        apiKey: process.env.HUGGINGFACE_API_KEY || '',
        baseUrl:
          process.env.HUGGINGFACE_BASE_URL || 'https://router.huggingface.co/v1',
        model:
          process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
      },
      // Local, keyless. Needs no API key, so it is gated on an explicit flag.
      {
        name: 'ollama',
        apiKey:
          process.env.OLLAMA_FALLBACK_ENABLED === 'true' ? 'local' : '',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
      },
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
          max_tokens: parseInt(process.env.MODEL_MAX_OUTPUT_TOKENS || '16384', 10),
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

  // Same tolerance as the primary client: models often wrap JSON in fences.
  private parseModelResponse(text: string): ExtractionOutput {
    let jsonStr = text.trim();
    const fenced = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenced) jsonStr = fenced[1].trim();
    try {
      return JSON.parse(jsonStr) as ExtractionOutput;
    } catch {
      const first = jsonStr.indexOf('{');
      const last = jsonStr.lastIndexOf('}');
      if (first !== -1 && last > first) {
        return JSON.parse(jsonStr.slice(first, last + 1)) as ExtractionOutput;
      }
      throw new Error('returned unparseable JSON');
    }
  }
}
