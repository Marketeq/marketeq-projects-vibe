// apps/offer-service/src/guards/listing-owner.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ListingOwnerGuard } from './listing-owner.guard';
import {
  ListingsClient,
  ListingNotFoundOrAccessDeniedException,
  ListingNotPublishedException,
  ListingsServiceUnavailableException,
} from '../integrations/listings.client';

describe('ListingOwnerGuard', () => {
  const buildContext = (overrides: {
    userId?: string;
    body?: Record<string, unknown>;
    authorization?: string;
  }): ExecutionContext => {
    const request = {
      user: overrides.userId ? { id: overrides.userId, sub: overrides.userId } : undefined,
      body: overrides.body ?? { jobListingId: 'L1' },
      headers: overrides.authorization ? { authorization: overrides.authorization } : {},
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  it('allows the listing owner', async () => {
    const listingsClient = { validateListing: jest.fn().mockResolvedValue({ id: 'L1' }) };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    const result = await guard.canActivate(buildContext({ userId: 'C1' }));

    expect(result).toBe(true);
    expect(listingsClient.validateListing).toHaveBeenCalledWith('L1', 'C1', undefined);
  });

  it('forwards the caller JWT so listings-service can validate ownership', async () => {
    const listingsClient = { validateListing: jest.fn().mockResolvedValue({ id: 'L1' }) };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    await guard.canActivate(buildContext({ userId: 'C1', authorization: 'Bearer abc.def.ghi' }));

    expect(listingsClient.validateListing).toHaveBeenCalledWith('L1', 'C1', 'abc.def.ghi');
  });

  it('rejects a non-owner with a generic 403, not a listing-specific message', async () => {
    const listingsClient = {
      validateListing: jest.fn().mockRejectedValue(new ListingNotFoundOrAccessDeniedException('L1')),
    };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    await expect(guard.canActivate(buildContext({ userId: 'C2' }))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(buildContext({ userId: 'C2' }))).rejects.toMatchObject({
      response: {
        statusCode: 403,
        error: 'LISTING_ACCESS_DENIED',
        message: 'You do not have access to this job listing.',
      },
    });
  });

  it('rejects a missing listing with the SAME 403 shape as a non-owner (anti-enumeration)', async () => {
    const listingsClient = {
      validateListing: jest.fn().mockRejectedValue(new ListingNotFoundOrAccessDeniedException('DOES-NOT-EXIST')),
    };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    await expect(
      guard.canActivate(buildContext({ userId: 'C1', body: { jobListingId: 'DOES-NOT-EXIST' } })),
    ).rejects.toMatchObject({
      response: { statusCode: 403, error: 'LISTING_ACCESS_DENIED', message: 'You do not have access to this job listing.' },
    });
  });

  it('fails closed when listings-service is unreachable — propagates 503, never allows', async () => {
    const listingsClient = {
      validateListing: jest.fn().mockRejectedValue(new ListingsServiceUnavailableException()),
    };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    await expect(guard.canActivate(buildContext({ userId: 'C1' }))).rejects.toBeInstanceOf(
      ListingsServiceUnavailableException,
    );
  });

  it('lets a not-published business error propagate as-is (not an authorization failure)', async () => {
    const listingsClient = {
      validateListing: jest.fn().mockRejectedValue(new ListingNotPublishedException('L1', 'draft')),
    };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    await expect(guard.canActivate(buildContext({ userId: 'C1' }))).rejects.toBeInstanceOf(
      ListingNotPublishedException,
    );
  });

  it('defers to DTO validation when jobListingId is missing, instead of guessing', async () => {
    const listingsClient = { validateListing: jest.fn() };
    const guard = new ListingOwnerGuard(listingsClient as unknown as ListingsClient);

    const result = await guard.canActivate(buildContext({ userId: 'C1', body: {} }));

    expect(result).toBe(true);
    expect(listingsClient.validateListing).not.toHaveBeenCalled();
  });
});
