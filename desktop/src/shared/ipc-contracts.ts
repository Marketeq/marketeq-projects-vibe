// src/shared/ipc-contracts.ts
// Typed registry of every IPC channel name. Both main and preload import
// from here so there is only one source of truth for the wire names.
//
// Phase 2 owns the `timer:*` / `idle:*` / `break:*` namespaces. Phase 3
// owns `permissions:*`, `screenshot:*`, `activity:*`, and `capture:*`.

import type {
  BreakKind,
  ContractId,
  IdleResolution,
  SessionEndReason,
  SessionId,
  TaskId,
} from './types';

export const IPC = {
  appInfo: 'app:info',
  ping: 'app:ping',
  dbTablesList: 'db:tables:list',

  // --- Permissions (doc 18) ---
  permissionsCheck: 'permissions:check',
  permissionsRequest: 'permissions:request',
  permissionsGetAll: 'permissions:get-all',
  permissionsOpenSettings: 'permissions:open-settings',
  permissionsChanged: 'permissions:changed',

  // --- Screenshot capture (doc 17) ---
  screenshotCaptureNow: 'screenshot:capture-now',
  screenshotGetStats: 'screenshot:get-stats',
  screenshotDelete: 'screenshot:delete',

  // --- Activity monitor (doc 17 §6) ---
  activityGetStats: 'activity:get-stats',
  activityGetRecent: 'activity:get-recent',

  // --- Capture supervisor ---
  captureHealth: 'capture:health',

  // --- Broadcast events (main → renderer) — Phase 3 ---
  eventScreenshotTaken: 'capture:screenshot-taken',
  eventActivitySampled: 'capture:activity-sampled',
  eventCaptureHealthChanged: 'capture:health-changed',

  // --- Phase 4 sync + offline ---
  syncGetStatus: 'sync:get-status',
  syncForceRun: 'sync:force-run',
  syncStatusChanged: 'sync:status-changed',
  syncProgress: 'sync:progress',
  syncError: 'sync:error',
  syncIdle: 'sync:idle',
  netOnlineChanged: 'net:online-changed',

  // --- Phase 2 timer commands (request/response) ---
  timerStart: 'timer:start',
  timerPause: 'timer:pause',
  timerResume: 'timer:resume',
  timerStop: 'timer:stop',
  timerBreakStart: 'timer:break-start',
  timerBreakEnd: 'timer:break-end',
  timerGetState: 'timer:get-state',
  idleResolve: 'idle:resolve',

  // --- Phase 2 timer broadcast events (main → renderer) ---
  timerStateChanged: 'timer:state-changed',
  timerTick: 'timer:tick',
  timerError: 'timer:error',
  idleResolutionNeeded: 'idle:resolution-needed',
  breakExpiring: 'break:expiring',
  breakExpired: 'break:expired',
  timerWorkReminder: 'timer:work-reminder',
  timerBreakReminder: 'timer:break-reminder',

  // --- Phase 5 Auth (doc 15) ---
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authRefresh: 'auth:refresh',
  authGetStatus: 'auth:get-status',

  // --- Phase 5 Auth broadcast events (main → renderer) ---
  authStatusChanged: 'auth:status-changed',
  authNeedsLogin: 'auth:needs-login',
  authLockedOut: 'auth:locked-out',
  authLoggedIn: 'auth:logged-in',
  authLoggedOut: 'auth:logged-out',
  authTokenExpired: 'auth:token-expired',

  // --- Phase 6 Onboarding (doc 04 §5.2 / doc 41 §2) ---
  onboardingGetState: 'onboarding:get-state',
  onboardingMarkStep: 'onboarding:mark-step',
  onboardingComplete: 'onboarding:complete',
  onboardingGetNotificationPrefs: 'onboarding:get-notification-prefs',
  onboardingSetNotificationPrefs: 'onboarding:set-notification-prefs',
  onboardingStateChanged: 'onboarding:state-changed',

  // --- Phase 6 Window manager ---
  windowShow: 'window:show',
  windowHide: 'window:hide',
  windowQuit: 'window:quit',

  // --- Phase 7 Updater ---
  updaterGetStatus: 'updater:get-status',
  updaterCheckNow: 'updater:check-now',
  updaterSetChannel: 'updater:set-channel',
  updaterDownload: 'updater:download',
  updaterQuitAndInstall: 'updater:quit-and-install',
  updaterStatusChanged: 'updater:status-changed',
  updaterProgress: 'updater:progress',
  updaterError: 'updater:error',

  // --- Contracts (fetched from backend API) ---
  contractsGetMine: 'contracts:get-mine',

  // --- Shell helpers ---
  shellOpenExternal: 'shell:open-external',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

// ---------- Permissions contracts ----------

export type OsPermissionKey =
  | 'screenRecording'
  | 'accessibility'
  | 'notifications'
  | 'autostart';

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'not_determined'
  | 'restricted'
  | 'not_applicable';

export type PermissionStatuses = Record<OsPermissionKey, PermissionStatus>;

// Short-form alias exposed to the renderer UX matching deliverable spec.
export type PermissionKindShort = 'screen' | 'accessibility' | 'notifications';
export type PermissionStatusShort = 'granted' | 'denied' | 'not-determined';

// ---------- Screenshot contracts ----------

export interface ScreenshotStats {
  capturedCount: number;
  capturedToday: number;
  lastCaptureAt: number | null;
  nextCaptureAt: number | null;
  isCapturing: boolean;
  privacyMode: boolean;
}

export interface ScreenshotTakenEvent {
  id: string;
  sessionId: string;
  takenAt: number;
  width: number;
  height: number;
  bytes: number;
  filePath: string;
  blurPath: string | null;
  displayId: string;
  sensitive: boolean;
}

// ---------- Activity monitor contracts ----------

export interface ActivityStats {
  sampledCount: number;
  activeCount: number;
  idleCount: number;
  lastSampleAt: number | null;
  activityLevel: number; // 0..1 rolling active/total over last 10 samples
  isRunning: boolean;
}

export interface ActivitySample {
  id: string;
  sessionId: string;
  sampledAt: number;
  active: boolean;
}

// ---------- Capture supervisor ----------

export interface CaptureHealth {
  screenshotsRunning: boolean;
  activityRunning: boolean;
  permissionsOk: boolean;
  lastError: string | null;
  updatedAt: number;
}

// ---------- Phase 2 Timer contracts ----------

export type TimerStateName =
  | 'Idle'
  | 'Counting'
  | 'Running'
  | 'Paused'
  | 'OnBreakPaid'
  | 'OnBreakUnpaid'
  | 'IdleSoftPaused'
  | 'OfflineStopped'
  | 'LockedDisputed';

export interface TimerSnapshotDTO {
  state: TimerStateName;
  activeSessionId: SessionId | null;
  pickedContract: { contractId: ContractId; taskId: TaskId } | null;
  elapsedSec: number;
  runningSec: number;
  breakRemainingSec: number | null;
  isOnBreak: boolean;
  pendingIdle:
    | null
    | {
        idleEventId: string;
        startedAt: number;
        endedAt: number;
        seconds: number;
      };
  updatedAt: number;
}

export interface TimerStartArgs {
  contractId: string;
  taskId: string;
  description?: string;
}

export interface TimerStopArgs {
  reason?: SessionEndReason;
}

export interface TimerBreakStartArgs {
  kind: BreakKind | 'custom';
  durationSec?: number;
}

export interface IdleResolveArgs {
  resolution: IdleResolution;
}

export interface TimerTickPayload {
  elapsedSec: number;
  runningSec: number;
  state: TimerStateName;
}

export interface TimerErrorPayload {
  code: string;
  message: string;
}

export interface IdleResolutionNeededPayload {
  idleEventId: string;
  startedAt: number;
  endedAt: number;
  seconds: number;
}

export interface BreakExpiringPayload {
  breakId: string;
  kind: BreakKind;
  remainingSec: number;
}

export interface BreakExpiredPayload {
  breakId: string;
  kind: BreakKind;
}

export interface ReminderPayload {
  elapsedSec: number;
}

// ---------- Phase 4 Sync contracts ----------

export interface SyncStatusDTO {
  online: boolean;
  running: boolean;
  queueDepth: number;
  deadLetterCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

export interface SyncProgressPayload {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export interface SyncErrorPayload {
  id: string;
  message: string;
}

// ---------- Phase 7 Updater contracts ----------

export type UpdaterReleaseChannel = 'stable' | 'beta' | 'alpha';
export type UpdaterState = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface UpdaterProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export interface UpdaterStatusDTO {
  currentVersion: string;
  channel: UpdaterReleaseChannel;
  state: UpdaterState;
  availableVersion: string | null;
  progress: UpdaterProgressInfo | null;
  lastError: string | null;
  lastCheckAt: number | null;
}

// ---------- Phase 5 Auth contracts ----------

import { z } from 'zod';

export const AuthLoginArgsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type AuthLoginArgs = z.infer<typeof AuthLoginArgsSchema>;

export interface AuthUserMirror {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  currency: string;
  pendingErasure: boolean;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  user: AuthUserMirror | null;
  /** Wall-clock ms when lockout expires, or null if not locked. */
  lockedUntil: number | null;
  /** Wall-clock ms when the current access token expires, or null. */
  expiresAt: number | null;
}

export type AuthLoginErrorCode =
  | 'ERR_AUTH_BAD_CREDENTIALS'
  | 'ERR_AUTH_LOCKED'
  | 'ERR_AUTH_RATE_LIMITED'
  | 'ERR_AUTH_NETWORK'
  | 'ERR_AUTH_INVALID_INPUT'
  | 'ERR_AUTH_SERVICE_DOWN'
  | 'ERR_AUTH_KEYCHAIN'
  | 'ERR_AUTH_UNKNOWN';

export type AuthLoginResult =
  | { ok: true; user: AuthUserMirror; expiresAt: number }
  | {
      ok: false;
      code: AuthLoginErrorCode;
      message: string;
      retryAfterSec?: number;
      lockedUntil?: number;
    };

export interface AuthLockedOutPayload {
  email: string;
  lockedUntil: number;
  reason: 'local_attempts' | 'server_rate_limit' | 'server_account_locked';
}

export interface AuthStatusChangedPayload {
  status: AuthStatus;
}

export interface AuthNeedsLoginPayload {
  reason:
    | 'no_session'
    | 'refresh_failed'
    | 'user_signed_out'
    | 'forced_sign_out';
}

// ---------- Phase 6 Onboarding contracts ----------

export const ONBOARDING_VERSION = 1;

export const ONBOARDING_STEPS = [
  'welcome',
  'privacy',
  'screenRecording',
  'accessibility',
  'notifications',
  'autostart',
  'done',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const OnboardingMarkStepArgsSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  status: z.enum(['granted', 'denied', 'skipped', 'completed']).optional(),
});
export type OnboardingMarkStepArgs = z.infer<typeof OnboardingMarkStepArgsSchema>;

export interface OnboardingState {
  userId: string | null;
  version: number;
  completed: boolean;
  completedAt: number | null;
  stepsCompleted: Record<string, { at: number; status: string }>;
}

export interface NotificationPrefs {
  workReminders: boolean;
  breakReminders: boolean;
  idleAlerts: boolean;
  syncErrors: boolean;
  permissionChanges: boolean;
  authAlerts: boolean;
}

export const NotificationPrefsSchema = z.object({
  workReminders: z.boolean(),
  breakReminders: z.boolean(),
  idleAlerts: z.boolean(),
  syncErrors: z.boolean(),
  permissionChanges: z.boolean(),
  authAlerts: z.boolean(),
});

// ---------- Phase 8 Validation schemas ----------

/** Structured error response for IPC handlers. */
export interface IpcErrorResult {
  ok: false;
  code: string;
  message: string;
}

export const TimerStartArgsSchema = z.object({
  contractId: z.string().min(1),
  taskId: z.string().min(1),
  description: z.string().max(2000).optional(),
});

export const TimerStopArgsSchema = z.object({
  reason: z.enum([
    'user_stop', 'offline_stop', 'idle_discard',
    'forced_signout', 'take_over', 'disputed', 'crash_recover',
  ]).optional(),
});

export const TimerBreakStartArgsSchema = z.object({
  kind: z.enum(['paid', 'unpaid', 'custom']),
  durationSec: z.number().int().positive().optional(),
});

export const IdleResolveArgsSchema = z.object({
  resolution: z.enum(['keep', 'discard', 'convert_to_break']),
});

export const PermissionCheckArgsSchema = z.enum(['screen', 'accessibility', 'notifications']);

export const ScreenshotDeleteArgsSchema = z.object({
  id: z.string().min(1),
});

export const ActivityGetRecentArgsSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
});

export const UpdaterSetChannelArgsSchema = z.enum(['stable', 'beta', 'alpha']);

export const ShellOpenExternalArgsSchema = z.object({
  url: z.string().url(),
});

// ---------- Phase 8 Power event IPC ----------

export const IPC_POWER = {
  errorFatal: 'error:fatal',
} as const;

// ---------- Contracts (from backend API) ----------

export interface BackendContract {
  id: string;
  groupId: string;
  clientId: string;
  talentId: string;
  title: string;
  rate: number;
  schedule: string;
  duration: string;
  status: string;
  startAtISO: string | null;
  endAtISO: string | null;
  projectId: string | null;
  serviceId: string | null;
  teamId: string | null;
  jobId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
