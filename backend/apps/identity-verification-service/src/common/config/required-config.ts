// Startup configuration check. Reports variable NAMES only — never values.
//
// DIDIT_FREE_KYC_WORKFLOW_ID, DIDIT_API_KEY and FRONTEND_URL are required in
// every environment (the hosted session cannot be created or returned to
// without them). DIDIT_WEBHOOK_SECRET is required only in staging and
// production: development may start without it, but the Free KYC webhook
// route then fails closed and rejects every delivery (see
// FreeKycService.handleWebhook), so a missing secret never means "accept
// unsigned webhooks".

const ALWAYS_REQUIRED = ['DIDIT_API_KEY', 'DIDIT_FREE_KYC_WORKFLOW_ID', 'FRONTEND_URL'] as const;
const STAGING_AND_PRODUCTION_REQUIRED = ['DIDIT_WEBHOOK_SECRET'] as const;

export function isStagingOrProduction(env: NodeJS.ProcessEnv): boolean {
  const appEnv = (env.APP_ENV ?? '').trim().toLowerCase();
  return appEnv === 'staging' || appEnv === 'production' || env.NODE_ENV === 'production';
}

export function findMissingRequiredConfig(env: NodeJS.ProcessEnv): string[] {
  const required: string[] = [...ALWAYS_REQUIRED];
  if (isStagingOrProduction(env)) required.push(...STAGING_AND_PRODUCTION_REQUIRED);
  return required.filter((name) => !env[name] || !env[name]?.trim());
}

export function assertRequiredConfig(env: NodeJS.ProcessEnv = process.env): void {
  const missing = findMissingRequiredConfig(env);
  if (missing.length > 0) {
    throw new Error(`identity-verification-service: missing required configuration: ${missing.join(', ')}`);
  }
}
