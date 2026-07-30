import { Module } from '@nestjs/common';
import { ParsingController } from './parsing.controller';
import { ParsingService } from './parsing.service';
import { FileValidator } from '../common/validation/file.validator';
import { TextExtractionService } from './extraction/text-extraction';
import { LengthGateService } from './extraction/length-gate';
import { ExtractionPipeline } from './extraction/extraction.pipeline';
import { AnthropicLlmClient } from './llm/anthropic-llm.client';
import { EXTRACTION_PORT } from './extraction/extraction.port';
import { LLM_CLIENT } from './llm/llm-client.port';

@Module({
  controllers: [ParsingController],
  providers: [
    ParsingService,
    FileValidator,
    TextExtractionService,
    LengthGateService,
    AnthropicLlmClient,
    {
      provide: LLM_CLIENT,
      useExisting: AnthropicLlmClient,
    },
    {
      provide: EXTRACTION_PORT,
      useClass: ExtractionPipeline,
    },
  ],
})
export class ParsingModule {}
