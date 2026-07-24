import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FaqAdapter } from './faq.adapter';
import { FaqAdapterHeuristic } from './faq.adapter.heuristic';
import { FaqContext, FaqSuggestion } from './faq.types';

/**
 * HuggingFace text-generation adapter for FAQ suggestions.
 *
 * Uses HuggingFace's unified Inference Providers router (OpenAI-compatible
 * chat completions) to generate question/answer pairs from a listing's
 * content.
 *
 * Fallback: on missing API key, HTTP error, timeout, or malformed
 * response → delegates to the heuristic adapter.
 *
 * Env config:
 *   HUGGINGFACE_API_KEY   required; absent = heuristic
 *   HF_FAQ_MODEL          default: meta-llama/Llama-3.1-8B-Instruct
 *   FAQ_HF_TIMEOUT_MS     default: 10000
 */
@Injectable()
export class FaqAdapterHuggingFace extends FaqAdapter {
  private readonly logger = new Logger(FaqAdapterHuggingFace.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly groqApiKey: string | undefined;
  private readonly groqModel: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly heuristic: FaqAdapterHeuristic,
  ) {
    super();
    this.model =
      configService.get<string>('HF_FAQ_MODEL') ||
      'meta-llama/Llama-3.1-8B-Instruct';
    this.apiKey = configService.get<string>('HUGGINGFACE_API_KEY');
    this.groqApiKey = configService.get<string>('GROQ_API_KEY');
    this.groqModel =
      configService.get<string>('GROQ_MODEL') || 'llama-3.1-8b-instant';
    this.timeoutMs = Number(
      configService.get<string>('FAQ_HF_TIMEOUT_MS') ?? 10000,
    );
  }

  async suggestFaqs(ctx: FaqContext): Promise<FaqSuggestion[]> {
    if (!this.apiKey && !this.groqApiKey) return this.heuristic.suggestFaqs(ctx);
    try {
      const content = await this.generate(this.buildFaqsPrompt(ctx));
      const parsed = content ? this.parseFaqArray(content) : null;
      if (parsed && parsed.length >= 3) return parsed.slice(0, 10);
      return this.heuristic.suggestFaqs(ctx);
    } catch (err) {
      this.logger.warn(
        `HF FAQ generation failed, falling back to heuristic: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.heuristic.suggestFaqs(ctx);
    }
  }

  async suggestAnswer(ctx: FaqContext, question: string): Promise<string> {
    if (!this.apiKey && !this.groqApiKey) return this.heuristic.suggestAnswer(ctx, question);
    try {
      const content = await this.generate(this.buildAnswerPrompt(ctx, question));
      const answer = content ? this.parseAnswer(content) : null;
      return answer || this.heuristic.suggestAnswer(ctx, question);
    } catch (err) {
      this.logger.warn(
        `HF FAQ answer failed, falling back to heuristic: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.heuristic.suggestAnswer(ctx, question);
    }
  }

  async suggestQuestions(ctx: FaqContext): Promise<string[]> {
    if (!this.apiKey && !this.groqApiKey) return this.heuristic.suggestQuestions(ctx);
    try {
      const content = await this.generate(this.buildQuestionsPrompt(ctx));
      const parsed = content ? this.parseStringArray(content) : null;
      if (parsed && parsed.length >= 3) return parsed.slice(0, 8);
      return this.heuristic.suggestQuestions(ctx);
    } catch (err) {
      this.logger.warn(
        `HF question generation failed, falling back to heuristic: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.heuristic.suggestQuestions(ctx);
    }
  }

  private buildQuestionsPrompt(ctx: FaqContext): string {
    return `<s>[INST] You are generating questions a buyer would ask about a marketplace listing before purchasing.

${this.contextLines(ctx)}

Generate 8 concise questions a buyer would want answered before starting, specific to this listing.
Do not answer them. Return ONLY a JSON array of question strings.
[/INST]`;
  }

  private parseStringArray(text: string): string[] | null {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return null;
      const out = parsed
        .filter((x: unknown) => typeof x === 'string')
        .map((x: string) => x.trim())
        .filter(Boolean);
      return out.length ? out : null;
    } catch {
      return null;
    }
  }

  private contextLines(ctx: FaqContext): string {
    const lines: string[] = [];
    lines.push(
      `Listing type: ${ctx.listingType === 'service' ? 'service' : 'project'}`,
    );
    if (ctx.title && ctx.title !== 'Enter Project Title') {
      lines.push(`Title: ${ctx.title}`);
    }
    if (ctx.categories?.length) {
      lines.push(`Categories: ${ctx.categories.join(', ')}`);
    }
    const tech = [
      ...new Set([...(ctx.skills ?? []), ...(ctx.tags ?? [])]),
    ].filter(Boolean);
    if (tech.length) lines.push(`Skills/tech: ${tech.slice(0, 8).join(', ')}`);
    if (ctx.durationMonths) {
      lines.push(`Estimated duration: ${ctx.durationMonths} months`);
    }
    const desc = ctx.shortDescription || ctx.fullDescription;
    if (desc) lines.push(`Description: ${desc.slice(0, 500)}`);
    if (ctx.scope?.length) {
      const scopeLines = ctx.scope
        .map((p) => {
          const tasks = p.tasks.slice(0, 8).join(', ');
          return tasks ? `${p.phaseName}: ${tasks}` : p.phaseName;
        })
        .join('\n');
      lines.push(`Scope:\n${scopeLines}`);
    }
    return lines.join('\n');
  }

  private buildFaqsPrompt(ctx: FaqContext): string {
    return `<s>[INST] You are writing FAQs for a marketplace listing that buyers read before purchasing.

${this.contextLines(ctx)}

Generate 10 frequently asked questions with helpful answers a buyer would want before starting.
Each answer must be concise (under 300 characters), specific to this listing, and written in a friendly professional tone.
Return ONLY a JSON array of objects, each with "question" and "answer" string fields.
[/INST]`;
  }

  private buildAnswerPrompt(ctx: FaqContext, question: string): string {
    return `<s>[INST] You are writing a single FAQ answer for a marketplace listing.

${this.contextLines(ctx)}

Question: ${question}

Write one concise answer (under 300 characters), specific to this listing, friendly and professional.
Return ONLY the answer text — no quotes, no labels.
[/INST]`;
  }

  private async generate(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const useGroq = !!this.groqApiKey;
    const url = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://router.huggingface.co/v1/chat/completions';
    const apiKey = useGroq ? this.groqApiKey : this.apiKey;
    const model = useGroq ? this.groqModel : this.model;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.4,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        this.logger.warn(
          `${useGroq ? 'Groq' : 'HF'} API returned ${res.status}: ${await res.text()}`,
        );
        return null;
      }

      const body = (await res.json()) as any;
      return (
        body?.choices?.[0]?.message?.content ??
        body?.generated_text ??
        (typeof body === 'string' ? body : null)
      );
    } catch (err) {
      clearTimeout(timer);
      this.logger.warn(
        `HF generate failed: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private parseFaqArray(text: string): FaqSuggestion[] | null {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return null;
      const out = parsed
        .filter(
          (x: any) =>
            x && typeof x.question === 'string' && typeof x.answer === 'string',
        )
        .map((x: any) => ({
          question: String(x.question).trim(),
          answer: String(x.answer).trim().slice(0, 300),
        }))
        .filter((x: FaqSuggestion) => x.question && x.answer);
      return out.length ? out : null;
    } catch {
      return null;
    }
  }

  private parseAnswer(text: string): string | null {
    const cleaned = text
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim();
    return cleaned ? cleaned.slice(0, 300) : null;
  }
}
