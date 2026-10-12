import { StatusAutoClearJob } from './status-auto-clear.job';

describe('StatusAutoClearJob.runDailySweep', () => {
  const buildJob = () => {
    const service = {
      clearExpiredFailedFinal: jest.fn().mockResolvedValue(2),
      clearEligibleBlockedAge: jest.fn().mockResolvedValue(1),
      evaluateDocumentExpiry: jest.fn().mockResolvedValue(3),
    };
    const job = new StatusAutoClearJob(service as any);
    const logger = { log: jest.fn(), error: jest.fn() };
    (job as any).logger = logger;
    return { job, service, logger };
  };

  it('runs all three clearing operations and logs a summary', async () => {
    const { job, service, logger } = buildJob();

    await job.runDailySweep();

    expect(service.clearExpiredFailedFinal).toHaveBeenCalledTimes(1);
    expect(service.clearEligibleBlockedAge).toHaveBeenCalledTimes(1);
    expect(service.evaluateDocumentExpiry).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('2 FAILED_FINAL cleared'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 BLOCKED_AGE cleared'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('3 transitioned to EXPIRED'));
  });
});
