// PMCM-831 — the tracked contract becoming paused/disputed/ended stops the
// timer; offline or failed checks never do.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContractStatusWatch } from '../contract-status-watch';

function setup(opts: { tracked: string | null; status: string | null }) {
  let tracked = opts.tracked;
  const fetchStatus = vi.fn(async () => opts.status);
  const onNotTrackable = vi.fn(async () => {
    tracked = null;
  });
  const watch = createContractStatusWatch({
    getTrackedContractId: () => tracked,
    fetchStatus,
    onNotTrackable,
    intervalMs: 60_000,
  });
  return { watch, fetchStatus, onNotTrackable };
}

describe('contract status watch (PMCM-831)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each(['disputed', 'paused', 'ended', 'closed', 'expired'])(
    'stops tracking when the contract becomes %s',
    async (status) => {
      const { watch, onNotTrackable } = setup({ tracked: 'con_1', status });
      await watch.checkNow();
      expect(onNotTrackable).toHaveBeenCalledWith('con_1', status);
    },
  );

  it('keeps tracking an active contract', async () => {
    const { watch, onNotTrackable } = setup({ tracked: 'con_1', status: 'active' });
    await watch.checkNow();
    expect(onNotTrackable).not.toHaveBeenCalled();
  });

  it('does nothing when the status cannot be read (offline / signed out)', async () => {
    const { watch, onNotTrackable } = setup({ tracked: 'con_1', status: null });
    await watch.checkNow();
    expect(onNotTrackable).not.toHaveBeenCalled();
  });

  it('does not call the backend when nothing is being tracked', async () => {
    const { watch, fetchStatus } = setup({ tracked: null, status: 'disputed' });
    await watch.checkNow();
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it('polls on the interval once started, and stops polling when stopped', async () => {
    const { watch, fetchStatus, onNotTrackable } = setup({ tracked: 'con_1', status: 'active' });
    watch.start();
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
    watch.stop();
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
    expect(onNotTrackable).not.toHaveBeenCalled();
  });
});
