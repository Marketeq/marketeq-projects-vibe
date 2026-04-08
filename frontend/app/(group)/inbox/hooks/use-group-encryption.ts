import { getRecipientPublicKey } from "@/src/api/user"
import { encryptWithPublicKey } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken } from "@/utils/auth"

export async function encryptGroupKeyForUser(
  groupId: string,
  userId: string
): Promise<string> {
  const aesKey = loadKey(groupId)
  if (!aesKey) throw new Error("Group AES key not found in localStorage")

  const token = getAccessToken()
  if (!token) throw new Error("User token not found in localStorage")

  const publicKey = await getRecipientPublicKey(userId, token)
  return await encryptWithPublicKey(aesKey, publicKey)
}

export async function addParticipantToGroup(
  groupId: string,
  newUserId: string
) {
  const token = getAccessToken()
  if (!token) throw new Error("No auth token")

  const encryptedGroupKey = await encryptGroupKeyForUser(groupId, newUserId)

  await apiFetch(`/v1/threads/${groupId}/participants`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { userId: newUserId, encryptedGroupKey },
  })
}
