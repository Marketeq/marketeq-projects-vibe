import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { IdentityVerificationGateController } from './identity-verification-gate.controller';
import { ACCOUNT_GATE_CHECK_PATTERN } from '../common/gate/account-gate-decision';

describe('IdentityVerificationGateController', () => {
  const decision = { gateOpen: false, missingRequirements: 'both' };

  const build = () => {
    const service = { getAccountGateDecision: jest.fn().mockResolvedValue(decision) };
    return { controller: new IdentityVerificationGateController(service as any), service };
  };

  it('returns the canonical decision the service computes for the requested user', async () => {
    const { controller, service } = build();

    await expect(controller.check({ userId: 'user-1' })).resolves.toBe(decision);
    expect(service.getAccountGateDecision).toHaveBeenCalledWith('user-1');
  });

  it.each([[undefined], [null], [{}], [{ userId: '' }], [{ userId: '   ' }], [{ userId: 42 }]])(
    'rejects a request that does not name an account (%j) instead of answering',
    async (payload) => {
      const { controller, service } = build();

      await expect(controller.check(payload as any)).rejects.toBeInstanceOf(RpcException);
      expect(service.getAccountGateDecision).not.toHaveBeenCalled();
    },
  );

  it('is registered on the gate-check message pattern', () => {
    const pattern = Reflect.getMetadata(
      PATTERN_METADATA,
      IdentityVerificationGateController.prototype.check,
    );
    expect(pattern).toEqual([ACCOUNT_GATE_CHECK_PATTERN]);
  });

  it('skips the app-wide ThrottlerGuard, which has no HTTP request to key on here', () => {
    expect(Reflect.getMetadata('THROTTLER:SKIPdefault', IdentityVerificationGateController)).toBe(true);
  });
});
