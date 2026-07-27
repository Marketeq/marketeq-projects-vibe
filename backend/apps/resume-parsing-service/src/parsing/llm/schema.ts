export const EXTRACTION_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    document_type: {
      type: 'string' as const,
      enum: ['resume', 'contract', 'invoice', 'other'],
      description: 'The type of document',
    },
    is_resume: {
      type: 'boolean' as const,
      description: 'Whether this document is a resume or CV',
    },
    confidence: {
      type: 'number' as const,
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for the classification (0.0 to 1.0)',
    },
    name: {
      type: ['string', 'null'] as const,
      description: 'The name of the person on the resume',
    },
    job_titles: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Job titles found in the resume, most recent first',
    },
    skills: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const, minLength: 1 },
        },
        required: ['name'] as const,
        additionalProperties: false,
      },
      description: 'Skills extracted from the resume — extract ALL skills found anywhere in the document',
    },
    education: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          institution: { type: ['string', 'null'] as const },
          degree: { type: ['string', 'null'] as const },
          field_of_study: { type: ['string', 'null'] as const },
          start_date: { type: ['string', 'null'] as const },
          end_date: { type: ['string', 'null'] as const },
        },
        required: ['institution', 'degree', 'field_of_study', 'start_date', 'end_date'] as const,
        additionalProperties: false,
      },
    },
    certifications: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const, minLength: 1 },
          issuing_body: { type: ['string', 'null'] as const },
        },
        required: ['name', 'issuing_body'] as const,
        additionalProperties: false,
      },
    },
    industries: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Industries the person has worked in, inferred from their work experience and company types (e.g. "Healthcare", "Fintech", "E-commerce", "SaaS", "Education", "Real Estate", "Automotive")',
    },
    work_experience: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          job_title: { type: ['string', 'null'] as const },
          company: { type: ['string', 'null'] as const },
          start_date: { type: ['string', 'null'] as const },
          end_date: { type: ['string', 'null'] as const },
          description: { type: ['string', 'null'] as const },
        },
        required: ['job_title', 'company', 'start_date', 'end_date', 'description'] as const,
        additionalProperties: false,
      },
    },
  },
  required: [
    'document_type',
    'is_resume',
    'confidence',
    'name',
    'job_titles',
    'skills',
    'education',
    'certifications',
    'industries',
    'work_experience',
  ] as const,
  additionalProperties: false,
};
