// src/main/db/repos/index.ts
import type { DbHandle } from '../connection';
import { createUserRepo } from './user.repo';
import { createDeviceRepo } from './device.repo';
import { createContractRepo } from './contract.repo';
import { createTaskRepo } from './task.repo';
import { createSessionRepo } from './session.repo';
import { createTimeEntryRepo } from './time-entry.repo';
import { createBreakRepo } from './break.repo';
import { createIdleRepo } from './idle.repo';
import { createScreenshotRepo } from './screenshot.repo';
import { createActivityRepo } from './activity.repo';
import { createDisputeRepo } from './dispute.repo';
import { createSyncQueueRepo } from './sync-queue.repo';
import { createPreferenceRepo } from './preference.repo';
import { createServiceHealthRepo } from './service-health.repo';
import { createInstallMetaRepo } from './install-meta.repo';
import { createAuthSessionRepo } from './auth-session.repo';
import { createAuthAttemptsRepo } from './auth-attempts.repo';
import { createPermissionGrantRepo } from './permission-grant.repo';

export function createRepos(db: DbHandle) {
  return {
    user: createUserRepo(db),
    device: createDeviceRepo(db),
    contract: createContractRepo(db),
    task: createTaskRepo(db),
    session: createSessionRepo(db),
    timeEntry: createTimeEntryRepo(db),
    break: createBreakRepo(db),
    idle: createIdleRepo(db),
    screenshot: createScreenshotRepo(db),
    activity: createActivityRepo(db),
    dispute: createDisputeRepo(db),
    syncQueue: createSyncQueueRepo(db),
    preference: createPreferenceRepo(db),
    serviceHealth: createServiceHealthRepo(db),
    installMeta: createInstallMetaRepo(db),
    authSession: createAuthSessionRepo(db),
    authAttempts: createAuthAttemptsRepo(db),
    permissionGrant: createPermissionGrantRepo(db),
  };
}
export type Repos = ReturnType<typeof createRepos>;
