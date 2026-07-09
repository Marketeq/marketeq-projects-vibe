// src/shared/types.ts
// Shared types between main, preload, and renderer processes.
// Mirrors the Data Dictionary (doc 00b) — all enums and IDs here are the
// single source of truth for cross-process boundaries.

export type Millis = number;

export type UserId = `usr_${string}`;
export type DeviceId = `dev_${string}`;
export type SessionId = `ses_${string}`;
export type TimeEntryId = `ent_${string}`;
export type BreakId = `brk_${string}`;
export type IdleId = `idl_${string}`;
export type ScreenshotId = `shot_${string}`;
export type ActivityId = `act_${string}`;
export type ContractId = `con_${string}`;
export type TaskId = `tsk_${string}`;
export type DisputeId = `dsp_${string}`;
export type SyncRequestId = `req_${string}`;

export type OsName = 'mac' | 'win';
export type Arch = 'arm64' | 'x64';

export type ContractStatus = 'active' | 'paused' | 'ended';
export type BreakKind = 'paid' | 'unpaid';
export type IdleResolution = 'keep' | 'discard' | 'convert_to_break';
export type ScreenshotStatus =
  | 'pending'
  | 'uploaded'
  | 'confirmed'
  | 'discarded'
  | 'failed';
export type SessionEndReason =
  | 'user_stop'
  | 'offline_stop'
  | 'idle_discard'
  | 'forced_signout'
  | 'take_over'
  | 'disputed'
  | 'crash_recover';
export type DisputeReason =
  | 'inaccurate_time'
  | 'wrong_task'
  | 'tech_issue'
  | 'other';
export type SyncQueueStatus =
  | 'pending'
  | 'inflight'
  | 'completed'
  | 'dead_letter';
export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// IPC surface typed contract
export type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

export interface AppInfo {
  version: string;
  platform: Platform;
  schemaVersion: number;
}

export interface PingResult {
  ok: true;
  receivedAt: Millis;
  echo: string;
}
