import { Inject, Injectable, Logger } from '@nestjs/common';
import { TextExtractionService } from './text-extraction';
import { LengthGateService } from './length-gate';
import { LLM_CLIENT, LlmClient } from '../llm/llm-client.port';
import {
  ExtractionPort,
  ExtractionInput,
  ExtractionOutput,
  ExtractionMeta,
  EXTRACTION_PORT,
} from './extraction.port';

@Injectable()
export class ExtractionPipeline implements ExtractionPort {
  private readonly logger = new Logger(ExtractionPipeline.name);

  constructor(
    private readonly textExtraction: TextExtractionService,
    private readonly lengthGate: LengthGateService,
    @Inject(LLM_CLIENT) private readonly llmClient: LlmClient,
  ) {}

  async extract(
    input: ExtractionInput,
  ): Promise<{ result: ExtractionOutput; meta: ExtractionMeta }> {
    const startTime = Date.now();

    // Stage 1: Text extraction (deterministic, no network)
    const rawText = await this.textExtraction.extract(input.buffer, input.mimeType);

    // Stage 2: Length gate
    const gateResult = this.lengthGate.check(rawText);

    // Stage 3: LLM call (classify + extract)
    const llmResult = await this.llmClient.call({
      text: gateResult.text,
      isNearEmpty: gateResult.isNearEmpty,
      buffer: gateResult.isNearEmpty ? input.buffer : undefined,
      mimeType: gateResult.isNearEmpty ? input.mimeType : undefined,
    });

    const processingMs = Date.now() - startTime;

    // Log shape, never values
    this.logger.log({
      msg: 'Extraction complete',
      correlationId: input.correlationId,
      documentType: llmResult.result.document_type,
      isResume: llmResult.result.is_resume,
      confidence: llmResult.result.confidence,
      skillCount: llmResult.result.skills.length,
      workCount: llmResult.result.work_experience.length,
      educationCount: llmResult.result.education.length,
      certCount: llmResult.result.certifications.length,
      industryCount: llmResult.result.industries.length,
      jobTitleCount: llmResult.result.job_titles.length,
      truncated: gateResult.truncated,
      extractedChars: gateResult.originalLength,
      modelAttempts: llmResult.attempts,
      processingMs,
    });

    return {
      result: llmResult.result,
      meta: {
        processingMs,
        modelAttempts: llmResult.attempts,
        detectedLanguages: llmResult.detectedLanguages,
        truncated: gateResult.truncated,
        extractedCharacters: gateResult.originalLength,
      },
    };
  }
}
