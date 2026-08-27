import 'react-native-get-random-values'
import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'
import * as SecureStore from 'expo-secure-store'
import api from '../config/api'

const SECRET_KEY_STORE = 'e2e_secret_key'
const PUBLIC_KEY_STORE = 'e2e_public_key'

export async function getOrCreateKeyPair(): Promise<{ publicKey: string; secretKey: string }> {
  const existingSecret = await SecureStore.getItemAsync(SECRET_KEY_STORE)
  const existingPublic = await SecureStore.getItemAsync(PUBLIC_KEY_STORE)
  if (existingSecret && existingPublic) {
    return { publicKey: existingPublic, secretKey: existingSecret }
  }
  const keyPair = nacl.box.keyPair()
  const publicKey = encodeBase64(keyPair.publicKey)
  const secretKey = encodeBase64(keyPair.secretKey)
  await SecureStore.setItemAsync(SECRET_KEY_STORE, secretKey)
  await SecureStore.setItemAsync(PUBLIC_KEY_STORE, publicKey)
  return { publicKey, secretKey }
}

export async function ensureKeysRegistered(token: string) {
  const { publicKey } = await getOrCreateKeyPair()
  try {
    await api.put('/messages/public-key', { publicKey }, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // Non-fatal — a failure here surfaces later as a clear send/receive error instead of silently.
  }
}

const publicKeyCache: Record<string, string> = {}

export async function getTheirPublicKey(userId: string, token: string): Promise<string | null> {
  if (publicKeyCache[userId]) return publicKeyCache[userId]
  try {
    const res = await api.get(`/messages/public-key/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
    const key = res.data?.data?.publicKey || res.data?.publicKey
    if (key) publicKeyCache[userId] = key
    return key || null
  } catch {
    return null
  }
}

export function encryptMessage(plaintext: string, theirPublicKeyB64: string, mySecretKeyB64: string) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const encrypted = nacl.box(decodeUTF8(plaintext), nonce, decodeBase64(theirPublicKeyB64), decodeBase64(mySecretKeyB64))
  return { ciphertext: encodeBase64(encrypted), nonce: encodeBase64(nonce) }
}

export function decryptMessage(ciphertextB64: string, nonceB64: string, theirPublicKeyB64: string, mySecretKeyB64: string): string | null {
  try {
    const decrypted = nacl.box.open(
      decodeBase64(ciphertextB64),
      decodeBase64(nonceB64),
      decodeBase64(theirPublicKeyB64),
      decodeBase64(mySecretKeyB64)
    )
    return decrypted ? encodeUTF8(decrypted) : null
  } catch {
    return null
  }
}
