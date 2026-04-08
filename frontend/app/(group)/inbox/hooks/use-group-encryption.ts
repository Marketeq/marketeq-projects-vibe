import { getRecipientPublicKey } from "@/src/api/user"
import { encryptWithPublicKey } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"

export async function encryptGroupKeyForUser(
  groupId: string,
  userId: string
): Promise<string> {
  const aesKey = loadKey(groupId)
  if (!aesKey) throw new Error("Group AES key not found in localStorage")

  //passing token
  const token = localStorage.getItem("token")
  if (!token) throw new Error("User token not found in localStorage")

  const publicKey = await getRecipientPublicKey(userId, token) // GET /users/:id
  return await encryptWithPublicKey(aesKey, publicKey)
}

export async function addParticipantToGroup(
  groupId: string,
  newUserId: string
) {
  const encryptedGroupKey = await encryptGroupKeyForUser(groupId, newUserId)

  await fetch(`/api/messaging/groups/${groupId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: newUserId,
      encryptedGroupKey,
    }),
  })
}
