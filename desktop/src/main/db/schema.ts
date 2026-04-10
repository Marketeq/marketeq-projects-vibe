// src/main/db/schema.ts
// Zod row schemas for every local DB table. Rows pulled out of better-sqlite3
// are parsed through these schemas before they enter the rest of the app.

import { z } from 'zod';

export const Bool01 = z.union([z.literal(0), z.literal(1)]);
export const Millis = z.number().int().nonnegative();

export const UserRow = z.object({
  id: z.string().startsWith('usr_'),
  email: z.string().email(),
  display_name: z.string().min(1),
  avatar_url: z.string().nullable(),
  timezone: z.string().min(1),
  currency: z.string().min(3).max(3),
  pending_erasure: Bool01,
  mirrored_at: Millis,
});
export type UserRow = z.infer<typeof UserRow>;

export const DeviceSelfRow = z.object({
  id: z.string().startsWith('dev_'),
  installation_uuid: z.string().min(1),
  os_name: z.enum(['mac', 'win']),
  os_version: z.string().min(1),
  app_version: z.string().min(1),
  arch: z.enum(['arm64', 'x64']),
  created_at: Millis,
});
export type DeviceSelfRow = z.infer<typeof DeviceSelfRow>;

export const ContractRow = z.object({
  id: z.string().startsWith('con_'),
  name: z.string().min(1),
  client_name: z.string().min(1),
  status: z.enum(['active', 'paused', 'ended']),
  currency: z.string().min(3).max(3),
  rate_minor: z.number().int().nonnegative(),
  daily_cap_seconds: z.number().int().nonnegative().nullable(),
  weekly_cap_seconds: z.number().int().nonnegative().nullable(),
  paid_break_allowance_seconds: z.number().int().nonnegative(),
  screenshot_interval_seconds: z.number().int().nonnegative(),
  mirrored_at: Millis,
});
export type ContractRow = z.infer<typeof ContractRow>;

export const TaskRow = z.object({
  id: z.string().startsWith('tsk_'),
  contract_id: z.string().startsWith('con_'),
  name: z.string().min(1),
  archived: Bool01,
  mirrored_at: Millis,
});
export type TaskRow = z.infer<typeof TaskRow>;

export const SessionEndReason = z.enum([
  'user_stop',
  'offline_stop',
  'idle_discard',
  'forced_signout',
  'take_over',
  'disputed',
  'crash_recover',
]);

export const SessionRow = z.object({
  id: z.string().startsWith('ses_'),
  user_id: z.string().startsWith('usr_'),
  contract_id: z.string().startsWith('con_'),
  task_id: z.string().startsWith('tsk_'),
  device_id: z.string().startsWith('dev_'),
  started_at: Millis,
  ended_at: Millis.nullable(),
  end_reason: SessionEndReason.nullable(),
  billable_seconds: z.number().int().nonnegative(),
  paid_break_seconds: z.number().int().nonnegative(),
  unpaid_break_seconds: z.number().int().nonnegative(),
  idle_seconds: z.number().int().nonnegative(),
  disputed: Bool01,
  synced_at: Millis.nullable(),
  created_at: Millis,
  updated_at: Millis,
});
export type SessionRow = z.infer<typeof SessionRow>;

export const TimeEntryRow = z.object({
  id: z.string().startsWith('ent_'),
  session_id: z.string().startsWith('ses_'),
  started_at: Millis,
  ended_at: Millis.nullable(),
  duration_seconds: z.number().int().nonnegative(),
  synced_at: Millis.nullable(),
});
export type TimeEntryRow = z.infer<typeof TimeEntryRow>;

export const BreakEventRow = z.object({
  id: z.string().startsWith('brk_'),
  session_id: z.string().startsWith('ses_'),
  kind: z.enum(['paid', 'unpaid']),
  started_at: Millis,
  ended_at: Millis.nullable(),
  synced_at: Millis.nullable(),
});
export type BreakEventRow = z.infer<typeof BreakEventRow>;

export const IdleEventRow = z.object({
  id: z.string().startsWith('idl_'),
  session_id: z.string().startsWith('ses_'),
  started_at: Millis,
  ended_at: Millis,
  seconds: z.number().int().nonnegative(),
  resolution: z.enum(['keep', 'discard', 'convert_to_break']).nullable(),
  synced_at: Millis.nullable(),
});
export type IdleEventRow = z.infer<typeof IdleEventRow>;

export const ScreenshotRow = z.object({
  id: z.string().startsWith('shot_'),
  session_id: z.string().startsWith('ses_'),
  taken_at: Millis,
  local_path: z.string().nullable(),
  r2_key: z.string().nullable(),
  status: z.enum(['pending', 'uploaded', 'confirmed', 'discarded', 'failed']),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  sensitive: Bool01,
  synced_at: Millis.nullable(),
  blur_path: z.string().nullable().optional(),
  display_id: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
});
export type ScreenshotRow = z.infer<typeof ScreenshotRow>;

export const PermissionGrantRow = z.object({
  key: z.enum(['screenRecording', 'accessibility', 'notifications', 'autostart']),
  status: z.enum([
    'granted',
    'denied',
    'not_determined',
    'restricted',
    'not_applicable',
  ]),
  platform: z.enum(['mac', 'win', 'linux', 'other']),
  last_checked_at: Millis,
  last_requested_at: Millis.nullable(),
  last_changed_at: Millis,
});
export type PermissionGrantRow = z.infer<typeof PermissionGrantRow>;

export const ActivityMinuteRow = z.object({
  id: z.string().startsWith('act_'),
  session_id: z.string().startsWith('ses_'),
  minute_start_at: Millis,
  active: Bool01,
  synced_at: Millis.nullable(),
});
export type ActivityMinuteRow = z.infer<typeof ActivityMinuteRow>;

export const DisputeRow = z.object({
  id: z.string().startsWith('dsp_'),
  session_id: z.string().startsWith('ses_'),
  reason: z.enum(['inaccurate_time', 'wrong_task', 'tech_issue', 'other']),
  note: z.string().nullable(),
  created_at: Millis,
  synced_at: Millis.nullable(),
});
export type DisputeRow = z.infer<typeof DisputeRow>;

export const SyncQueueRow = z.object({
  id: z.string().startsWith('req_'),
  created_at: Millis,
  method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1),
  body_json: z.string(),
  status: z.enum(['pending', 'inflight', 'completed', 'dead_letter']),
  attempts: z.number().int().nonnegative(),
  last_error: z.string().nullable(),
  next_attempt_at: Millis.nullable(),
});
export type SyncQueueRow = z.infer<typeof SyncQueueRow>;

export const PreferenceRow = z.object({
  key: z.string().min(1),
  value_json: z.string(),
  updated_at: Millis,
});
export type PreferenceRow = z.infer<typeof PreferenceRow>;

export const ServiceHealthRow = z.object({
  service: z.string().min(1),
  status: z.enum(['up', 'degraded', 'down', 'unknown']),
  checked_at: Millis,
  latency_ms: z.number().int().nonnegative().nullable(),
});
export type ServiceHealthRow = z.infer<typeof ServiceHealthRow>;

export const InstallMetaRow = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type InstallMetaRow = z.infer<typeof InstallMetaRow>;

export const AuthSessionRow = z.object({
  id: z.string().min(1),
  user_id: z.string().startsWith('usr_'),
  access_token_expires_at: Millis,
  refresh_token_ref: z.string().min(1),
  created_at: Millis,
  updated_at: Millis,
});
export type AuthSessionRow = z.infer<typeof AuthSessionRow>;
