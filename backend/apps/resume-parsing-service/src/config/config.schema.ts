export interface ResumeParsingConfig {
  port: number;
  nodeEnv: string;
  serviceAuthToken: string;
  maxFileBytes: number;
  requestDeadlineMs: number;
  textExtractionTimeoutMs: number;
  modelTimeoutMs: number;
  modelMaxAttempts: number;
  confidenceThreshold: number;
  maxExtractedChars: number;
  hardRejectChars: number;
  nearEmptyTextChars: number;
  geminiApiKey: string;
  modelId: string;
  modelMaxOutputTokens: number;
  modelTemperature: number;
}

export function loadConfig(): ResumeParsingConfig {
  const config: ResumeParsingConfig = {
    port: parseInt(process.env.PORT || '3028', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceAuthToken: process.env.SERVICE_AUTH_TOKEN || '',
    maxFileBytes: parseInt(process.env.MAX_FILE_BYTES || String(5 * 1024 * 1024), 10),
    requestDeadlineMs: parseInt(process.env.REQUEST_DEADLINE_MS || '120000', 10),
    textExtractionTimeoutMs: parseInt(process.env.TEXT_EXTRACTION_TIMEOUT_MS || '10000', 10),
    modelTimeoutMs: parseInt(process.env.MODEL_TIMEOUT_MS || '45000', 10),
    modelMaxAttempts: parseInt(process.env.MODEL_MAX_ATTEMPTS || '2', 10),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    maxExtractedChars: parseInt(process.env.MAX_EXTRACTED_CHARS || '150000', 10),
    hardRejectChars: parseInt(process.env.HARD_REJECT_CHARS || '500000', 10),
    nearEmptyTextChars: parseInt(process.env.NEAR_EMPTY_TEXT_CHARS || '50', 10),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // Keep in sync with gemini-llm.client.ts's fallback. gemini-2.0-flash was
    // retired by Google and now 404s on generateContent, which surfaced as a
    // 503 from this service and a 502 on POST /api/resume/upload. Google's own
    // deprecation notice names gemini-3.6-flash as the successor.
    modelId: process.env.MODEL_ID || 'gemini-3.6-flash',
    modelMaxOutputTokens: parseInt(process.env.MODEL_MAX_OUTPUT_TOKENS || '16384', 10),
    modelTemperature: parseFloat(process.env.MODEL_TEMPERATURE || '0'),
  };

  // Cross-field validation
  const totalModelTime = config.modelTimeoutMs * config.modelMaxAttempts;
  const totalPipelineTime = config.textExtractionTimeoutMs + totalModelTime;
  if (totalPipelineTime >= config.requestDeadlineMs) {
    throw new Error(
      `Timeout arithmetic violation: textExtraction(${config.textExtractionTimeoutMs}) + model(${config.modelTimeoutMs} x ${config.modelMaxAttempts}) = ${totalPipelineTime}ms >= deadline(${config.requestDeadlineMs}ms)`,
    );
  }

  if (config.hardRejectChars <= config.maxExtractedChars) {
    throw new Error(
      `HARD_REJECT_CHARS (${config.hardRejectChars}) must be greater than MAX_EXTRACTED_CHARS (${config.maxExtractedChars})`,
    );
  }

  if (config.nodeEnv === 'production' && !config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required in production');
  }

  if (config.nodeEnv === 'production' && !config.serviceAuthToken) {
    throw new Error('SERVICE_AUTH_TOKEN is required in production');
  }

  return config;
}
