import 'react-native-get-random-values'
import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'
import * as SecureStore from 'expo-secure-store'
import api from '../config/api'

const SECRET_KEY_STORE = 'e2e_secret_key'
const PUBLIC_KEY_STORE = 'e2e_public_key'
const publicKeyCache: Record<string, string> = {}

export async function getOrCreateKeyPair() {
  const secretKey = await SecureStore.getItemAsync(SECRET_KEY_STORE)
  const publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORE)
  if (secretKey && publicKey) return { secretKey, publicKey }
  const pair = nacl.box.keyPair()
  const next = { secretKey: encodeBase64(pair.secretKey), publicKey: encodeBase64(pair.publicKey) }
  await SecureStore.setItemAsync(SECRET_KEY_STORE, next.secretKey)
  await SecureStore.setItemAsync(PUBLIC_KEY_STORE, next.publicKey)
  return next
}

export async function ensureKeysRegistered(token: string) {
  const { publicKey } = await getOrCreateKeyPair()
  await api.put('/messages/public-key', { publicKey }, { headers: { Authorization: `Bearer ${token}` } })
}

export async function getTheirPublicKey(userId: string, token: string) {
  if (publicKeyCache[userId]) return publicKeyCache[userId]
  const res = await api.get(`/messages/public-key/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
  const key = res.data?.data?.publicKey
  if (key) publicKeyCache[userId] = key
  return key || null
}

export function encryptForBoth(plaintext: string, theirPublicKeyB64: string, myPublicKeyB64: string, mySecretKeyB64: string) {
  const messageBytes = decodeUTF8(plaintext)
  const receiverNonce = nacl.randomBytes(nacl.box.nonceLength)
  const senderNonce = nacl.randomBytes(nacl.box.nonceLength)
  const ciphertext = nacl.box(messageBytes, receiverNonce, decodeBase64(theirPublicKeyB64), decodeBase64(mySecretKeyB64))
  const senderCiphertext = nacl.box(messageBytes, senderNonce, decodeBase64(myPublicKeyB64), decodeBase64(mySecretKeyB64))
  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(receiverNonce),
    senderCiphertext: encodeBase64(senderCiphertext),
    senderNonce: encodeBase64(senderNonce)
  }
}

export function decryptMessage(ciphertextB64: string, nonceB64: string, theirPublicKeyB64: string, mySecretKeyB64: string) {
  try {
    const opened = nacl.box.open(decodeBase64(ciphertextB64), decodeBase64(nonceB64), decodeBase64(theirPublicKeyB64), decodeBase64(mySecretKeyB64))
    return opened ? encodeUTF8(opened) : null
  } catch {
    return null
  }
}
