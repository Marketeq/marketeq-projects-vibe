import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmClient } from './gemini-llm.client';
import { OpenAiCompatibleLlmClient } from './openai-compatible-llm.client';
import { LlmCallInput, LlmCallOutput, LlmClient } from './llm-client.port';

/**
 * Gemini is the primary extractor, but it returns "Service is currently
 * overloaded" often enough that a single-provider setup surfaces as a 502 on
 * upload and reads to the user as "upload failed". The Anthropic client already
 * implements the same port, so rather than fail we can fail *over*: exhaust
 * Gemini's own retries first, then try Anthropic before giving up.
 *
 * Order: Groq (main) -> Grok/xAI (backup) -> Hugging Face -> Ollama, then
 * Gemini last. Gemini lost the primary slot because it returns "Service is
 * currently overloaded" often enough to surface as a failed upload.
 * Anthropic is deliberately absent: cost.
 */
@Injectable()
export class FailoverLlmClient implements LlmClient {
  private readonly logger = new Logger(FailoverLlmClient.name);

  constructor(
    private readonly primary: OpenAiCompatibleLlmClient,
    private readonly fallback: GeminiLlmClient,
  ) {}


  async call(input: LlmCallInput): Promise<LlmCallOutput> {
    // Route by document size. Groq is much faster but its free tier is a hard
    // 8000 tokens/MINUTE, so a long CV cannot fit in a single request there at
    // all. Gemini's free allowance is far larger, so anything long goes to it
    // first and Groq becomes the fallback; short documents keep the fast path.
    const longDocChars = parseInt(
      process.env.LLM_LONG_DOC_CHARS || '14000',
      10,
    );
    const isLongDocument = (input.text?.length ?? 0) > longDocChars;

    const [first, second] = isLongDocument
      ? ([this.fallback, this.primary] as const)
      : ([this.primary, this.fallback] as const);

    if (isLongDocument) {
      this.logger.log(
        `Document is ${input.text.length} chars; routing to the larger-context model first`,
      );
    }

    if (first === this.primary && !this.primary.isConfigured()) {
      return this.fallback.call(input);
    }

    try {
      return await first.call(input);
    } catch (firstError) {
      const reason =
        firstError instanceof Error ? firstError.message : String(firstError);
      this.logger.warn(`Primary model unavailable (${reason}); trying fallback`);
      try {
        const result = await second.call(input);
        this.logger.log('Fallback model succeeded');
        return result;
      } catch (secondError) {
        const fbReason =
          secondError instanceof Error
            ? secondError.message
            : String(secondError);
        this.logger.error(`Fallback model also failed: ${fbReason}`);
        throw firstError;
      }
    }
  }
}
