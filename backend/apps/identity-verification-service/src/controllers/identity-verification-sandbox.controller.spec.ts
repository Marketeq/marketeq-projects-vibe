import { NotFoundException } from '@nestjs/common';
import { IdentityVerificationSandboxController } from './identity-verification-sandbox.controller';
import { SandboxOnlyGuard } from '../common/guards/sandbox-only.guard';
import type { HostedBiometricSessionProvider } from '../providers/biometric-session/hosted-biometric-session-provider.interface';

// Offline only: HostedBiometricSessionProvider is fully mocked below — no
// real network call, no real Didit session, no real DIDIT_API_KEY. Built
// with plain `new` + hand-built mocks, matching this service's other
// provider/controller-level specs (see
// didit-hosted-biometric-session.provider.spec.ts), not a Nest
// TestingModule.
describe('IdentityVerificationSandboxController', () => {
  let provider: jest.Mocked<HostedBiometricSessionProvider>;
  let controller: IdentityVerificationSandboxController;

  beforeEach(() => {
    provider = {
      createSession: jest.fn(),
      fetchPortraitFromDocumentCheckSession: jest.fn(),
    };
    controller = new IdentityVerificationSandboxController(provider);
  });

  afterEach(() => {
    delete process.env.DIDIT_BIOMETRIC_WORKFLOW_ID;
  });

  describe('beginBiometricSession', () => {
    it('creates a hosted session via the shared provider and returns only sessionId and url', async () => {
      process.env.DIDIT_BIOMETRIC_WORKFLOW_ID = 'workflow-123';
      provider.createSession.mockResolvedValue({
        sessionId: 'session-abc',
        url: 'https://verification.didit.me/session/abc',
        status: 'Not Started',
      });

      const result = await controller.beginBiometricSession({
        portraitImageBase64: 'base64-image-data',
      });

      expect(result).toEqual({ sessionId: 'session-abc', url: 'https://verification.didit.me/session/abc' });
      // status is deliberately never forwarded to the caller.
      expect(Object.keys(result)).toEqual(['sessionId', 'url']);

      expect(provider.createSession).toHaveBeenCalledTimes(1);
      expect(provider.createSession).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        portraitImageBase64: 'base64-image-data',
        vendorData: expect.stringMatching(/^sandbox-diagnostic-/),
      });
    });

    it('never sends DIDIT_API_KEY anywhere in the response', async () => {
      process.env.DIDIT_BIOMETRIC_WORKFLOW_ID = 'workflow-123';
      provider.createSession.mockResolvedValue({
        sessionId: 'session-abc',
        url: 'https://verification.didit.me/session/abc',
        status: 'Not Started',
      });

      const result = await controller.beginBiometricSession({
        portraitImageBase64: 'base64-image-data',
      });

      expect(JSON.stringify(result)).not.toMatch(/DIDIT_API_KEY|apiKey/i);
    });

    it('rejects when DIDIT_BIOMETRIC_WORKFLOW_ID is not configured, without calling the provider', async () => {
      delete process.env.DIDIT_BIOMETRIC_WORKFLOW_ID;

      await expect(
        controller.beginBiometricSession({ portraitImageBase64: 'base64-image-data' }),
      ).rejects.toThrow('DIDIT_BIOMETRIC_WORKFLOW_ID is not configured');
      expect(provider.createSession).not.toHaveBeenCalled();
    });

    it('propagates a provider failure instead of swallowing it', async () => {
      process.env.DIDIT_BIOMETRIC_WORKFLOW_ID = 'workflow-123';
      provider.createSession.mockRejectedValue(new Error('vendor unreachable'));

      await expect(
        controller.beginBiometricSession({ portraitImageBase64: 'base64-image-data' }),
      ).rejects.toThrow('vendor unreachable');
    });
  });
});

// SandboxOnlyGuard is the ONLY thing gating IdentityVerificationSandboxController
// outside development — tested directly and in isolation for that reason.
describe('SandboxOnlyGuard', () => {
  let guard: SandboxOnlyGuard;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    guard = new SandboxOnlyGuard();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows the request through when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    expect(guard.canActivate({} as never)).toBe(true);
  });

  it.each(['production', 'staging', 'test', undefined])(
    'throws NotFoundException when NODE_ENV is %s',
    (nodeEnv) => {
      if (nodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = nodeEnv;
      }
      expect(() => guard.canActivate({} as never)).toThrow(NotFoundException);
    },
  );
});
