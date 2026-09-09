export type PiiSensitivity = 'high' | 'medium' | 'low';

export interface PiiFieldEntry {
  table: string;
  column: string;
  sensitivity: PiiSensitivity;
  meaning: string;
  source: string;
  currentProtection: string;
  apiExposure: string;
  loggingRedactionStatus: 'explicitly redacted' | 'not explicitly named — gap';
}

export const PII_FIELD_CATALOG: readonly PiiFieldEntry[] = [
  {
    table: 'identity_documents',
    column: 'document_number',
    sensitivity: 'high',
    meaning: 'Raw document number, as captured or entered.',
    source: 'Doc 03 Step 4b, §6b',
    currentProtection: 'Plain varchar(64) column, no encryption at rest (Doc 03 §10).',
    apiExposure:
      'Accepted as request input; never returned in any response DTO — DocumentResponseDto omits it intentionally.',
    loggingRedactionStatus: 'explicitly redacted',
  },
  {
    table: 'identity_documents',
    column: 'document_number_normalized',
    sensitivity: 'high',
    meaning: 'Trimmed, upper-cased copy of document_number, used only for duplicate matching.',
    source: 'Doc 03 Step 4b, §6b, §8a',
    currentProtection: 'Plain varchar(64) column, no encryption at rest. Indexed for duplicate-match lookups.',
    apiExposure: 'Never returned in any response DTO — used only internally by the duplicate-detection transaction.',
    loggingRedactionStatus: 'explicitly redacted',
  },
  {
    table: 'identity_documents',
    column: 'document_image_reference',
    sensitivity: 'high',
    meaning: 'Pointer (Cloudflare R2 object key) to the stored document image.',
    source: 'Doc 03 Step 4b, §6b',
    currentProtection:
      'Plain varchar(512) column. The underlying image is protected only by R2 bucket-level access control.',
    apiExposure:
      'Returned only in DocumentUploadUrlResponseDto, immediately after the client\'s own presigned upload — the client already generated this key.',
    loggingRedactionStatus: 'explicitly redacted',
  },
  {
    table: 'verification_attempts',
    column: 'failure_code',
    sensitivity: 'medium',
    meaning: 'Vendor-provided failure code for a failed verification attempt.',
    source: 'Doc 03 §6c; Service Overview §3 item 12',
    currentProtection: 'Plain varchar(64) column, no encryption at rest.',
    apiExposure: 'Never returned to the end user or internal caller.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
  {
    table: 'identity_verification_profiles',
    column: 'verified_home_country',
    sensitivity: 'low',
    meaning: 'The country the user confirmed as home country.',
    source: 'Doc 03 §6a, Service Overview §5',
    currentProtection: 'Plain char(2) column, no encryption at rest.',
    apiExposure: 'Returned to the caller themselves via GET /me — their own data.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
  {
    table: 'identity_verification_profiles',
    column: 'detected_country',
    sensitivity: 'low',
    meaning: 'Most recent LocationProvider reading.',
    source: 'Doc 03 §6a, Section 4',
    currentProtection: 'Plain char(2) column, no encryption at rest.',
    apiExposure: 'Returned to the caller themselves via GET /me — their own data.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
  {
    table: 'identity_verification_profiles',
    column: 'detected_region_state',
    sensitivity: 'low',
    meaning: 'Region/state component of the current-location display.',
    source: 'Doc 03 §6a',
    currentProtection: 'Plain varchar(120) column, no encryption at rest.',
    apiExposure: 'Returned to the caller themselves via GET /me — their own data.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
  {
    table: 'identity_verification_profiles',
    column: 'detected_city',
    sensitivity: 'low',
    meaning: 'City component of the current-location display.',
    source: 'Doc 03 §6a',
    currentProtection: 'Plain varchar(120) column, no encryption at rest.',
    apiExposure: 'Returned to the caller themselves via GET /me — their own data.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
  {
    table: 'identity_verification_profiles',
    column: 'time_zone',
    sensitivity: 'low',
    meaning: 'IANA tz string, derived via MaxMind GeoLite2 IP resolution.',
    source: 'Doc 03 §6a',
    currentProtection: 'Plain varchar(64) column, no encryption at rest.',
    apiExposure: 'Returned to the caller themselves via GET /me — their own data.',
    loggingRedactionStatus: 'not explicitly named — gap',
  },
] as const;
