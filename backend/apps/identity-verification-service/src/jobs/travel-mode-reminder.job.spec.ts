import { TravelModeReminderJob } from './travel-mode-reminder.job';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';

describe('TravelModeReminderJob.runDailySweep', () => {
  const buildProfile = (id: string): IdentityVerificationProfile =>
    ({ id, userId: `user-${id}` }) as IdentityVerificationProfile;

  const buildJob = (profiles: IdentityVerificationProfile[]) => {
    const profileRepository = {
      find: jest.fn().mockResolvedValue(profiles),
      save: jest.fn(),
    };
    const events = { publish: jest.fn() };
    const job = new TravelModeReminderJob(profileRepository as any, events as any);
    const logger = { log: jest.fn(), error: jest.fn() };
    (job as any).logger = logger;
    return { job, profileRepository, events, logger };
  };

  it('processes every due profile when none fail', async () => {
    const profiles = [buildProfile('p1'), buildProfile('p2'), buildProfile('p3')];
    const { job, logger } = buildJob(profiles);
    const evaluateSpy = jest.spyOn(job as any, 'evaluateAndSendIfDue').mockResolvedValue(undefined);

    await job.runDailySweep();

    expect(evaluateSpy).toHaveBeenCalledTimes(3);
    expect(evaluateSpy).toHaveBeenNthCalledWith(1, profiles[0], expect.any(Date));
    expect(evaluateSpy).toHaveBeenNthCalledWith(2, profiles[1], expect.any(Date));
    expect(evaluateSpy).toHaveBeenNthCalledWith(3, profiles[2], expect.any(Date));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('continues to the second profile when the first fails', async () => {
    const profiles = [buildProfile('p1'), buildProfile('p2')];
    const { job } = buildJob(profiles);
    const evaluateSpy = jest
      .spyOn(job as any, 'evaluateAndSendIfDue')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    await job.runDailySweep();

    expect(evaluateSpy).toHaveBeenCalledTimes(2);
    expect(evaluateSpy).toHaveBeenNthCalledWith(2, profiles[1], expect.any(Date));
  });

  it('logs the failure with the profile id, without leaking the raw error', async () => {
    const profiles = [buildProfile('p1')];
    const { job, logger } = buildJob(profiles);
    const sensitiveError = new Error(
      'duplicate key value violates unique constraint "users_email_key" DETAIL: Key (email)=(secret@example.com) already exists',
    );
    jest.spyOn(job as any, 'evaluateAndSendIfDue').mockRejectedValue(sensitiveError);

    await job.runDailySweep();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [loggedMessage] = logger.error.mock.calls[0];
    expect(loggedMessage).toContain('p1');
    expect(loggedMessage).not.toContain('secret@example.com');
    expect(loggedMessage).not.toContain('boom');
    expect(loggedMessage).not.toContain(sensitiveError.message);
  });
});
