import { ExtractionOutput } from '../extraction/extraction.port';

export interface LlmCallInput {
  text: string;
  isNearEmpty: boolean;
  buffer?: Buffer;
  mimeType?: string;
}

export interface LlmCallOutput {
  result: ExtractionOutput;
  attempts: number;
  detectedLanguages: string[];
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');

export interface LlmClient {
  call(input: LlmCallInput): Promise<LlmCallOutput>;
}
