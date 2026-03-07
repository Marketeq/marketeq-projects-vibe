// src/crypto/indexedDb.ts
import { openDB } from "idb"

const DB = openDB("messaging", 1, {
  upgrade(db) {
    db.createObjectStore("keys")
  },
})

export async function saveKey(convId: string, rawKeyB64: string) {
  ;(await DB).put("keys", rawKeyB64, convId)
}

export async function loadKey(convId: string): Promise<Uint8Array> {
  const b64 = (await DB).get("keys", convId)
  return Uint8Array.from(atob(await b64), (c) => c.charCodeAt(0))
}
