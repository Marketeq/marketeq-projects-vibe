export interface ExtractionInput {
  buffer: Buffer;
  mimeType: string;
  correlationId: string;
}

export interface ExtractionOutput {
  document_type: 'resume' | 'contract' | 'invoice' | 'other';
  is_resume: boolean;
  confidence: number;
  name: string | null;
  job_titles: string[];
  skills: { name: string }[];
  work_experience: {
    job_title: string | null;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
  }[];
  education: {
    institution: string | null;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  certifications: {
    name: string;
    issuing_body: string | null;
  }[];
  industries: string[];
}

export interface ExtractionMeta {
  processingMs: number;
  modelAttempts: number;
  detectedLanguages: string[];
  truncated: boolean;
  extractedCharacters: number;
}

export const EXTRACTION_PORT = Symbol('EXTRACTION_PORT');

export interface ExtractionPort {
  extract(input: ExtractionInput): Promise<{ result: ExtractionOutput; meta: ExtractionMeta }>;
}
