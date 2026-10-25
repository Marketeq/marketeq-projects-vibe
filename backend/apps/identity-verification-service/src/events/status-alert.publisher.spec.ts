import { of, throwError } from 'rxjs';
import { StatusAlertPublisher, statusAlertOccurrenceKey } from './status-alert.publisher';
import { STATUS_ALERT_COPY } from './status-alert-copy';

function setup(emit = jest.fn().mockReturnValue(of(undefined))) {
  return { emit, publisher: new StatusAlertPublisher({ emit } as any) };
}

describe('StatusAlertPublisher', () => {
  it('Verified is keyed by the approved session and supersedes Submitted for Review', async () => {
    const { emit, publisher } = setup();
    await expect(publisher.verified('u1', 'sess-1')).resolves.toBe(true);
    expect(emit).toHaveBeenCalledWith(
      'notification.status_alert.upsert',
      expect.objectContaining({
        recipientId: 'u1',
        type: 'verified',
        occurrenceKey: 'identity-verified:sess-1',
        supersedes: ['submitted_for_review'],
        title: STATUS_ALERT_COPY.verified.title,
      }),
    );
  });

  it('the Verified alert carries the exact Figma copy', () => {
    expect(STATUS_ALERT_COPY.verified).toEqual({
      title: 'All set! Your identity and location are verified.',
      body: 'You now have full access to all features.',
    });
  });

  it('Submitted for Review is keyed by the session and supersedes nothing', async () => {
    const { emit, publisher } = setup();
    await publisher.submittedForReview('u1', 'sess-2');
    expect(emit.mock.calls[0][1]).toMatchObject({
      type: 'submitted_for_review',
      occurrenceKey: 'submitted-for-review:sess-2',
      supersedes: [],
    });
  });

  it('Home Country Updated is keyed by the session and supersedes Travel Mode', async () => {
    const { emit, publisher } = setup();
    await publisher.homeCountryUpdated('u1', 'sess-3');
    expect(emit.mock.calls[0][1]).toMatchObject({
      type: 'home_country_updated',
      occurrenceKey: 'home-country-updated:sess-3',
      supersedes: ['travel_mode'],
    });
  });

  it('Travel Mode is keyed by the activation timestamp, so a new activation is a new alert', async () => {
    const { emit, publisher } = setup();
    const first = new Date('2026-10-23T10:00:00.000Z');
    const second = new Date('2026-11-23T10:00:00.000Z');
    await publisher.travelMode('u1', first);
    await publisher.travelMode('u1', second);
    expect(emit.mock.calls[0][1].occurrenceKey).toBe('travel-mode:2026-10-23T10:00:00.000Z');
    expect(emit.mock.calls[1][1].occurrenceKey).not.toBe(emit.mock.calls[0][1].occurrenceKey);
    expect(statusAlertOccurrenceKey.travelMode(first)).toBe(emit.mock.calls[0][1].occurrenceKey);
  });

  it('only ever carries a safe in-app link and no PII in metadata beyond ids', async () => {
    const { emit, publisher } = setup();
    await publisher.verified('u1', 'sess-1');
    expect(emit.mock.calls[0][1].link).toBe('/talent-dashboard');
    expect(emit.mock.calls[0][1].metadata).toEqual({ hostedKycSessionId: 'sess-1' });
  });

  it('never throws: a broker failure resolves false', async () => {
    const { publisher } = setup(jest.fn().mockReturnValue(throwError(() => new Error('down'))));
    await expect(publisher.travelMode('u1', new Date())).resolves.toBe(false);
  });
});
