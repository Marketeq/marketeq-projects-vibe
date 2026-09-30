import { assertRequiredConfig, findMissingRequiredConfig, isStagingOrProduction } from './required-config';

const base = {
  DIDIT_API_KEY: 'k',
  DIDIT_FREE_KYC_WORKFLOW_ID: 'w',
  FRONTEND_URL: 'http://localhost:3000',
};

describe('required startup configuration', () => {
  it('accepts development without DIDIT_WEBHOOK_SECRET', () => {
    expect(findMissingRequiredConfig({ ...base, NODE_ENV: 'development' })).toEqual([]);
    expect(() => assertRequiredConfig({ ...base, NODE_ENV: 'development' })).not.toThrow();
  });

  it.each([
    [{ APP_ENV: 'staging' }],
    [{ APP_ENV: 'production' }],
    [{ NODE_ENV: 'production' }],
  ])('requires DIDIT_WEBHOOK_SECRET in staging/production (%j)', (extra) => {
    expect(isStagingOrProduction(extra as any)).toBe(true);
    expect(findMissingRequiredConfig({ ...base, ...extra } as any)).toEqual(['DIDIT_WEBHOOK_SECRET']);
    expect(findMissingRequiredConfig({ ...base, ...extra, DIDIT_WEBHOOK_SECRET: 's' } as any)).toEqual([]);
  });

  it.each(['DIDIT_API_KEY', 'DIDIT_FREE_KYC_WORKFLOW_ID', 'FRONTEND_URL'])('requires %s in every environment', (name) => {
    const env: any = { ...base, NODE_ENV: 'development' };
    delete env[name];
    expect(findMissingRequiredConfig(env)).toEqual([name]);
    env[name] = '   ';
    expect(findMissingRequiredConfig(env)).toEqual([name]);
  });

  it('names missing variables but never includes any configured value in the error', () => {
    const env: any = { ...base, DIDIT_API_KEY: 'super-secret-key-value', NODE_ENV: 'development' };
    delete env.FRONTEND_URL;
    try {
      assertRequiredConfig(env);
      fail('expected throw');
    } catch (err) {
      expect((err as Error).message).toContain('FRONTEND_URL');
      expect((err as Error).message).not.toContain('super-secret-key-value');
    }
  });
});
