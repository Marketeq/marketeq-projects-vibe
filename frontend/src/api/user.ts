// export async function getRecipientPublicKey(userId: string): Promise<string> {
//      console.log("userId:", userId);
//   const res = await fetch(`http://localhost:3007/api/messaging/${userId}/public-key`);
//   const data = await res.json();
//   console.log("Received public key:", data.publicKey);
//   return data.publicKey; // Assuming your backend returns { publicKey: "..." }
// }
// src/api/user.ts or wherever you define your API helpers
import { apiFetch } from "../lib/api"

export async function getRecipientPublicKey(userId: string): Promise<string> {
  console.log("Fetching public key for userId:", userId)

  const data = await apiFetch<{ publicKey: string }>(
    `/messaging/get-public-key?userId=${userId}`,
    { method: "GET" }
  )

  console.log("Received public key:", data.publicKey)
  return data.publicKey
}
