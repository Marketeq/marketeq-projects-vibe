// The REAL Didit webhook event envelope, verified directly against
// docs.didit.me/integration/webhooks (fetched 2026-09-24/25 this
// engagement — not the placeholder shape in
// dto/webhooks/didit-webhook.payload.dto.ts, which this module does not
// modify or replace; that file is still what the live, wired-in webhook
// controller uses today).
//
// Documented field list: event_id, session_id, webhook_type, timestamp,
// created_at, application_id, environment, status, workflow_id,
// vendor_data, metadata, decision. Status values are exact, case-sensitive
// strings (e.g. "Approved", "Declined", "Kyc Expired" — note the single
// capital K) — never normalize/lowercase them.
export interface DiditWebhookEvent {
  event_id: string;
  session_id: string;
  webhook_type: string;
  timestamp: number;
  created_at: string;
  application_id: string;
  environment: 'live' | 'sandbox';
  status: string;
  workflow_id: string | null;
  vendor_data: string | null;
  metadata: Record<string, unknown> | null;
  /**
   * Shape not fully specified by the docs page for this envelope. Directly
   * observed this engagement (live sandbox `GET /v3/session/{id}/decision/`
   * call) to resemble the full session-decision object — id_verifications,
   * liveness_checks, face_matches, etc. — but that was the decision
   * *endpoint's* response, not confirmed to be byte-identical to this
   * field. Left as an untyped passthrough deliberately, not modeled
   * further, to avoid asserting a structure that hasn't been directly
   * verified for this exact field.
   */
  decision: Record<string, unknown> | null;
}
