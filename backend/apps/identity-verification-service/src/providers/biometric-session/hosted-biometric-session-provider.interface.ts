// Types for Didit's HOSTED session creation (POST /v3/session/) used for
// the biometric (Liveness + Face Match) stage — verified against Didit's
// live OpenAPI spec, same engagement as the standalone adapters in
// ../document-verification, ../face-match, ../liveness.
//
// This is deliberately a SEPARATE call path from those three standalone
// adapters: the approved product flow (Christopher's direction, confirmed
// this engagement) uses Didit's hosted page for face+liveness, not our
// own standalone calls to those endpoints — so
// StandaloneFaceMatchProvider / StandalonePassiveLivenessProvider stay
// unused by design in this flow, not because they're broken.

export interface CreateHostedBiometricSessionInput {
  /** The Business-Console-configured Biometric Authentication workflow's
   * id. Read from process.env.DIDIT_BIOMETRIC_WORKFLOW_ID by the
   * implementation, never hardcoded — the sandbox and live Consoles have
   * different ids for a workflow of the same name (confirmed this
   * engagement: sandbox `8cdfb7be-...`, live `430a3d18-...`). */
  workflowId: string;
  /** Base64 image bytes, explicitly supplied — this adapter never relies
   * on Didit's automatic vendor_data-based stored-face reuse, confirmed
   * this engagement to be able to silently resolve to an OLDER approved
   * session's face rather than the current document check's. */
  portraitImageBase64: string;
  /** Our own document id (IdentityDocument.id) as the correlation key —
   * NOT used by Didit to select a reference face (portraitImageBase64
   * always does that), only for our own later lookups (GET .../sessions/
   * ?vendor_data=, if ever needed) and Business Console visibility. */
  vendorData: string;
}

export interface CreateHostedBiometricSessionResult {
  sessionId: string;
  url: string;
  status: string;
}

export interface HostedBiometricSessionProvider {
  createSession(
    input: CreateHostedBiometricSessionInput,
  ): Promise<CreateHostedBiometricSessionResult>;

  /**
   * Looks up a standalone document-check session's own persisted decision
   * (requires that check to have used saveApiRequest=true) and returns its
   * portrait as a base64 string, or null if the decision has no usable
   * portrait yet/at all. This is a single, targeted, request-driven
   * lookup — called once, when "Begin verifying" is clicked — never a
   * recurring poll.
   */
  fetchPortraitFromDocumentCheckSession(requestId: string): Promise<string | null>;
}

export const HOSTED_BIOMETRIC_SESSION_PROVIDER = Symbol('HOSTED_BIOMETRIC_SESSION_PROVIDER');
