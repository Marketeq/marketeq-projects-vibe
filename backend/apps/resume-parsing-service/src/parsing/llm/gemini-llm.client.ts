import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParseException } from '../../common/errors/parse.exception';
import { ExtractionOutput } from '../extraction/extraction.port';
import { LlmClient, LlmCallInput, LlmCallOutput } from './llm-client.port';
import { SYSTEM_PROMPT, buildUserPrompt, buildScannedDocumentPrompt } from './prompt';

@Injectable()
export class GeminiLlmClient implements LlmClient {
  private readonly logger = new Logger(GeminiLlmClient.name);
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly maxOutputTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    // Keep in sync with config.schema.ts's fallback — see the note there on
    // why gemini-2.0-flash cannot be used as a default any more.
    this.modelId = process.env.MODEL_ID || 'gemini-3.6-flash';
    this.maxOutputTokens = parseInt(process.env.MODEL_MAX_OUTPUT_TOKENS || '16384', 10);
    this.temperature = parseFloat(process.env.MODEL_TEMPERATURE || '0');
    this.timeoutMs = parseInt(process.env.MODEL_TIMEOUT_MS || '45000', 10);
    this.maxAttempts = parseInt(process.env.MODEL_MAX_ATTEMPTS || '2', 10);
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      if (!this.apiKey) {
        throw ParseException.modelUnavailable();
      }
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    return this.client;
  }

  async call(input: LlmCallInput): Promise<LlmCallOutput> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await this.singleCall(input, attempt);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Model call attempt ${attempt}/${this.maxAttempts} failed: ${lastError.message}`,
        );
        if (attempt < this.maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    this.logger.error(`All ${this.maxAttempts} model attempts failed`);
    throw ParseException.modelUnavailable();
  }

  private async singleCall(input: LlmCallInput, attempt: number): Promise<LlmCallOutput> {
    const genAI = this.getClient();

    const model = genAI.getGenerativeModel({
      model: this.modelId,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: this.maxOutputTokens,
        temperature: this.temperature,
        responseMimeType: 'application/json',
      },
    });

    const userPrompt = input.isNearEmpty
      ? buildScannedDocumentPrompt()
      : buildUserPrompt(input.text);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      });

      clearTimeout(timer);

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No text content in model response');
      }

      this.logger.log(`Raw model response (first 2000 chars): ${text.substring(0, 2000)}`);

      const parsed = this.parseModelResponse(text);
      const detectedLanguages = this.detectLanguages(input.text);

      return {
        result: parsed,
        attempts: attempt,
        detectedLanguages,
      };
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof ParseException) throw err;

      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('abort') || message.includes('timeout') || message.includes('DEADLINE_EXCEEDED')) {
        throw ParseException.deadlineExceeded();
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        throw ParseException.serviceOverloaded();
      }
      if (message.includes('UNAVAILABLE') || message.includes('503')) {
        throw ParseException.modelUnavailable();
      }
      throw new Error(`Model call failed: ${message}`);
    }
  }

  private parseModelResponse(text: string): ExtractionOutput {
    let jsonStr = text.trim();

    // Handle markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let raw: any;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      this.logger.error('Failed to parse model JSON response');
      throw ParseException.modelUnavailable();
    }

    if (typeof raw.document_type !== 'string') {
      throw ParseException.modelUnavailable();
    }
    if (typeof raw.is_resume !== 'boolean') {
      throw ParseException.modelUnavailable();
    }
    if (typeof raw.confidence !== 'number') {
      throw ParseException.modelUnavailable();
    }

    return {
      document_type: this.normalizeDocType(raw.document_type),
      is_resume: raw.is_resume,
      confidence: Math.max(0, Math.min(1, raw.confidence)),
      name: this.normalizeNullableString(raw.name),
      job_titles: Array.isArray(raw.job_titles)
        ? raw.job_titles.filter((t: any) => typeof t === 'string' && t.trim())
        : [],
      skills: Array.isArray(raw.skills)
        ? raw.skills
            .filter((s: any) =>
              (typeof s === 'string' && s.trim()) ||
              (s?.name && typeof s.name === 'string' && s.name.trim()),
            )
            .map((s: any) =>
              typeof s === 'string' ? { name: s.trim() } : { name: s.name.trim() },
            )
        : [],
      work_experience: Array.isArray(raw.work_experience)
        ? raw.work_experience
            .filter(
              (w: any) =>
                (w?.job_title && typeof w.job_title === 'string') ||
                (w?.company && typeof w.company === 'string'),
            )
            .map((w: any) => ({
              job_title: this.normalizeNullableString(w.job_title),
              company: this.normalizeNullableString(w.company),
              start_date: this.normalizeNullableString(w.start_date),
              end_date: this.normalizeNullableString(w.end_date),
              description: this.normalizeNullableString(w.description),
            }))
        : [],
      education: Array.isArray(raw.education)
        ? raw.education
            .filter(
              (e: any) =>
                (e?.institution && typeof e.institution === 'string') ||
                (e?.degree && typeof e.degree === 'string'),
            )
            .map((e: any) => ({
              institution: this.normalizeNullableString(e.institution),
              degree: this.normalizeNullableString(e.degree),
              field_of_study: this.normalizeNullableString(e.field_of_study),
              start_date: this.normalizeNullableString(e.start_date),
              end_date: this.normalizeNullableString(e.end_date),
            }))
        : [],
      certifications: Array.isArray(raw.certifications)
        ? raw.certifications
            .filter((c: any) => c?.name && typeof c.name === 'string' && c.name.trim())
            .map((c: any) => ({
              name: c.name.trim(),
              issuing_body: this.normalizeNullableString(c.issuing_body),
            }))
        : [],
      industries: Array.isArray(raw.industries)
        ? raw.industries.filter((i: any) => typeof i === 'string' && i.trim()).map((i: any) => i.trim())
        : [],
    };
  }

  private normalizeDocType(
    type: string,
  ): 'resume' | 'contract' | 'invoice' | 'other' {
    const normalized = type.toLowerCase().trim();
    if (['resume', 'contract', 'invoice', 'other'].includes(normalized)) {
      return normalized as 'resume' | 'contract' | 'invoice' | 'other';
    }
    return 'other';
  }

  private normalizeNullableString(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (!str || str === 'undefined' || str === 'null') return null;
    return str;
  }

  private detectLanguages(text: string): string[] {
    const languages = new Set<string>();
    if (/[a-zA-Z]/.test(text)) languages.add('en');
    if (/[\u00C0-\u024F]/.test(text)) languages.add('extended-latin');
    if (/[\u4E00-\u9FFF]/.test(text)) languages.add('zh');
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) languages.add('ja');
    if (/[\uAC00-\uD7AF]/.test(text)) languages.add('ko');
    if (/[\u0600-\u06FF]/.test(text)) languages.add('ar');
    if (/[\u0900-\u097F]/.test(text)) languages.add('hi');
    if (/[\u0400-\u04FF]/.test(text)) languages.add('ru');
    return Array.from(languages);
  }
}
