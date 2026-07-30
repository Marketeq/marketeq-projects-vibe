import { Inject, Injectable, Logger } from '@nestjs/common';
import { EXTRACTION_PORT, ExtractionPort } from './extraction/extraction.port';
import { ParseResponseDto } from './dto/parse-response.dto';

@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);
  private readonly confidenceThreshold: number;

  constructor(
    @Inject(EXTRACTION_PORT) private readonly pipeline: ExtractionPort,
  ) {
    this.confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7');
  }

  async parse(
    buffer: Buffer,
    mimeType: string,
    correlationId: string,
    idempotencyKey: string,
  ): Promise<ParseResponseDto> {
    const { result, meta } = await this.pipeline.extract({
      buffer,
      mimeType,
      correlationId,
    });

    return ParseResponseDto.from(
      result,
      meta,
      correlationId,
      idempotencyKey,
      this.confidenceThreshold,
    );
  }
}
