/**
 * ILLUSTRATIVE ONLY — see the callout above this file.
 * Do not deploy or call this against a real environment;
 * InternalServiceGuard rejects every request unconditionally until real
 * internal-service auth replaces it (Doc 04 Step 6, Doc 07 Step 4b).
 */

export interface InternalStatusResponse {
  identityVerificationStatus: string;
  locationVerificationStatus: string;
}

export async function getVerificationStatus(
  baseUrl: string,
  userId: string,
  internalServiceToken: string, // Placeholder — not resolved today
): Promise<InternalStatusResponse> {
  const response = await fetch(
    `${baseUrl}/v1/internal/identity-verification/status/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${internalServiceToken}` } },
  );

  if (!response.ok) {
    const errorBody = await response.json();
    // Shared error shape — Doc 04 Step 6b
    throw new Error(
      `identity-verification-service returned ${response.status}: ${errorBody.code ?? 'UNKNOWN'} — ${errorBody.message}`,
    );
  }

  return response.json();
}
