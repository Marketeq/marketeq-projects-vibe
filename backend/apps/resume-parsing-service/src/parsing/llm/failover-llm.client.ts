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
    // Groq is main (fast, free); the OpenAI-compatible client walks its own
    // ordered chain groq -> xai(grok) -> huggingface -> ollama. Gemini is kept
    // as the final fallback rather than removed - it works when it isn't
    // overloaded, which is what pushed it out of the primary slot.
    if (!this.primary.isConfigured()) return this.fallback.call(input);
    try {
      return await this.primary.call(input);
    } catch (primaryError) {

      const reason =
        primaryError instanceof Error ? primaryError.message : String(primaryError);
      this.logger.warn(`Primary model unavailable (${reason}); trying fallback`);
      try {
        const result = await this.fallback.call(input);
        this.logger.log('Fallback model succeeded');
        return result;
      } catch (fallbackError) {
        const fbReason =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        this.logger.error(`Fallback model also failed: ${fbReason}`);
        throw primaryError;
      }
    }
  }
}
