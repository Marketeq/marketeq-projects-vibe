import { ExtractionOutput, ExtractionMeta } from '../extraction/extraction.port';

export class ParseResponseDto {
  result: ExtractionOutput;
  meta: {
    correlationId: string;
    idempotencyKey: string;
    confidenceThreshold: number;
    processingMs: number;
    modelAttempts: number;
    detectedLanguages: string[];
    truncated: boolean;
    extractedCharacters: number;
  };

  static from(
    result: ExtractionOutput,
    extractionMeta: ExtractionMeta,
    correlationId: string,
    idempotencyKey: string,
    confidenceThreshold: number,
  ): ParseResponseDto {
    const dto = new ParseResponseDto();
    dto.result = result;
    dto.meta = {
      correlationId,
      idempotencyKey,
      confidenceThreshold,
      processingMs: extractionMeta.processingMs,
      modelAttempts: extractionMeta.modelAttempts,
      detectedLanguages: extractionMeta.detectedLanguages,
      truncated: extractionMeta.truncated,
      extractedCharacters: extractionMeta.extractedCharacters,
    };
    return dto;
  }
}
