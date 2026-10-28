import { IdentityVerificationService } from './identity-verification.service';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import {
  HomeCountryChangeInProgressException,
  TravelModeConfirmationUnavailableException,
  TravelModeNotActiveException,
} from '../common/errors/domain-exceptions';
import {
  StatusAlertPublisher,
  statusAlertOccurrenceKey,
} from '../events/status-alert.publisher';

/**
 * An already-active traveler's Update > Temporarily traveling (PMCM-651): Travel Mode is
 * confirmed again. The period is untouched; the only effect is a new persistent
 * "Travel Mode is on" occurrence, handed to notification-service through StatusAlertPublisher.
 */
describe('IdentityVerificationService — confirmActiveTravelMode', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = new Date('2026-10-26T15:00:00.000Z').getTime();
  const ACTIVATED = new Date(NOW - 2 * DAY);
  const ID_1 = '11111111-1111-4111-8111-111111111111';
  const ID_2 = '22222222-2222-4222-8222-222222222222';
  type Row = Record<string, any>;

  const profile = (over: Row = {}): Row => ({
    id: 'p1',
    userId: 'u1',
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: ACTIVATED,
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: new Date(NOW + DAY),
    travelCheckInCount: 0,
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    verifiedHomeCountry: 'US',
    pendingHomeCountry: null,
    pendingHomeCountryConfirmedAt: null,
    pendingRelocationSessionId: null,
    ...over,
  });

  let row: Row | null;
  let before: string;
  let update: jest.Mock;
  let save: jest.Mock;
  let emitted: any[];
  let brokerOk: boolean;
  let service: IdentityVerificationService;

  const build = (initial: Row | null = profile()) => {
    row = initial;
    before = JSON.stringify(row);
    emitted = [];
    brokerOk = true;
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    update = jest.fn(async () => ({ affected: 1 }));
    save = jest.fn();
    const repo = {
      findOne: jest.fn(async () => (row ? { ...row } : null)),
      update,
      save,
      create: jest.fn(),
    };
    const client = {
      emit: jest.fn((pattern: string, message: any) => {
        emitted.push({ pattern, message });
        return {
          pipe: () => ({
            subscribe: (o: any) =>
              brokerOk ? (o.next?.(undefined), o.complete?.()) : o.error?.(new Error('down')),
          }),
        };
      }),
    };
    const publisher = new StatusAlertPublisher(client as any);
    jest.spyOn((publisher as any).logger, 'warn').mockImplementation(() => undefined);
    service = new IdentityVerificationService(
      repo as any,
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
      { publish: jest.fn() } as any,
      {} as any,
      publisher,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  };

  afterEach(() => jest.restoreAllMocks());

  it('publishes a travel_mode occurrence keyed by the confirmation id and changes nothing on the profile', async () => {
    build();
    await service.confirmActiveTravelMode('u1', ID_1);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].pattern).toBe('notification.status_alert.upsert');
    expect(emitted[0].message).toMatchObject({
      recipientId: 'u1',
      type: 'travel_mode',
      occurrenceKey: statusAlertOccurrenceKey.travelModeConfirmed(ID_1),
      metadata: { confirmationId: ID_1 },
      supersedes: [],
    });
    expect(emitted[0].message.occurrenceKey).toBe(`travel-mode-confirmed:${ID_1}`);
    // The existing period's dates, duration and schedule are untouched.
    expect(update).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(JSON.stringify(row)).toBe(before);
  });

  it('the same confirmation id (a retry) produces the same occurrence key; a new id a new one', async () => {
    build();
    await service.confirmActiveTravelMode('u1', ID_1);
    await service.confirmActiveTravelMode('u1', ID_1);
    await service.confirmActiveTravelMode('u1', ID_2);
    const keys = emitted.map((e) => e.message.occurrenceKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
    // It is a different occurrence from the activation's own alert.
    expect(keys[0]).not.toBe(statusAlertOccurrenceKey.travelMode(ACTIVATED));
  });

  it('when the alert cannot be handed over the request fails (503) and nothing is recorded', async () => {
    build();
    brokerOk = false;
    await expect(service.confirmActiveTravelMode('u1', ID_1)).rejects.toBeInstanceOf(
      TravelModeConfirmationUnavailableException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(JSON.stringify(row)).toBe(before);
  });

  it('is refused (409 TRAVEL_MODE_NOT_ACTIVE) and publishes nothing when Travel Mode is not in force', async () => {
    for (const over of [
      { travelModeActive: false },
      { travelClassification: null },
      { travelClassification: TravelClassification.PERMANENTLY_RELOCATED },
      { travelModeActivatedAt: new Date(NOW - 60 * DAY) }, // the period has ended
    ]) {
      build(profile(over));
      await expect(service.confirmActiveTravelMode('u1', ID_1)).rejects.toBeInstanceOf(
        TravelModeNotActiveException,
      );
      expect(emitted).toHaveLength(0);
    }
    build(null);
    await expect(service.confirmActiveTravelMode('u1', ID_1)).rejects.toBeInstanceOf(
      TravelModeNotActiveException,
    );
  });

  it('is refused while a home-country change is running', async () => {
    build(
      profile({
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(NOW - 1000),
        pendingRelocationSessionId: 's1',
        identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
      }),
    );
    await expect(service.confirmActiveTravelMode('u1', ID_1)).rejects.toBeInstanceOf(
      HomeCountryChangeInProgressException,
    );
    expect(emitted).toHaveLength(0);
  });
});
