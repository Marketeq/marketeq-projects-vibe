import { IdentityVerificationService } from './identity-verification.service';
import {
  DeclaredDuration,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import { ClassificationRequiredException } from '../common/errors/domain-exceptions';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

/**
 * Focused spec for Travel Mode activation (recordTravelDuration): the first
 * reminder is due exactly 3 days after activation (no 5-minute reminder), and
 * every new activation starts with a clean reminder state.
 */
describe('IdentityVerificationService — Travel Mode activation', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  const buildService = (existingProfile: any) => {
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(existingProfile),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn((profile: any) => Promise.resolve({ id: 'p1', ...profile })),
    };
    const events = { publish: jest.fn() };

    const service = new IdentityVerificationService(
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      events as any,
    );

    return { service, profileRepository, events };
  };

  const travelling = (overrides: Record<string, unknown> = {}) => ({
    userId: 'u1',
    detectedCountry: 'US',
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: false,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: null,
    ...overrides,
  });

  it('sets the first reminder due exactly 3 days after activation', async () => {
    const { service } = buildService(travelling());

    const saved = await service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS);

    expect(saved.travelModeActive).toBe(true);
    expect(saved.travelModeActivatedAt).toBeInstanceOf(Date);
    expect(saved.nextTravelReminderAt).toBeInstanceOf(Date);
    expect(saved.nextTravelReminderAt!.getTime() - saved.travelModeActivatedAt!.getTime()).toBe(
      3 * DAY_MS,
    );
  });

  it('does not schedule a 5-minute reminder', async () => {
    const { service } = buildService(travelling());

    const saved = await service.recordTravelDuration('u1', DeclaredDuration.NOT_SURE);

    const delay = saved.nextTravelReminderAt!.getTime() - saved.travelModeActivatedAt!.getTime();
    expect(delay).not.toBe(5 * 60 * 1000);
    expect(delay).toBeGreaterThanOrEqual(3 * DAY_MS);
  });

  it('a new activation resets lastTravelReminderSentAt and restarts the schedule', async () => {
    const previous = travelling({
      travelModeActive: true,
      lastTravelReminderSentAt: new Date('2026-01-10T09:00:00Z'),
      nextTravelReminderAt: new Date('2026-01-14T09:00:00Z'),
    });
    const { service } = buildService(previous);

    const saved = await service.recordTravelDuration('u1', DeclaredDuration.ONE_TO_TWO_WEEKS);

    expect(saved.lastTravelReminderSentAt).toBeNull();
    expect(saved.nextTravelReminderAt!.getTime()).toBe(
      saved.travelModeActivatedAt!.getTime() + 3 * DAY_MS,
    );
    expect(saved.nextTravelReminderAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('still publishes the activation event (the immediate activation confirmation is unaffected)', async () => {
    const { service, events } = buildService(travelling());

    await service.recordTravelDuration('u1', DeclaredDuration.MORE_THAN_TWO_WEEKS);

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED }),
    );
  });

  it('still requires a Temporarily Traveling classification', async () => {
    const { service, profileRepository } = buildService(travelling({ travelClassification: null }));

    await expect(
      service.recordTravelDuration('u1', DeclaredDuration.A_FEW_DAYS),
    ).rejects.toBeInstanceOf(ClassificationRequiredException);
    expect(profileRepository.save).not.toHaveBeenCalled();
  });
});
