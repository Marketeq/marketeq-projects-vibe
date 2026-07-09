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
    this.timeoutMs = Number(
      configService.get<string>('FAQ_HF_TIMEOUT_MS') ?? 10000,
    );
  }

  async suggestFaqs(ctx: FaqContext): Promise<FaqSuggestion[]> {
    if (!this.apiKey) return this.heuristic.suggestFaqs(ctx);
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
    if (!this.apiKey) return this.heuristic.suggestAnswer(ctx, question);
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

    try {
      const res = await fetch(
        `https://router.huggingface.co/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.4,
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (!res.ok) {
        this.logger.warn(`HF API returned ${res.status}: ${await res.text()}`);
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
