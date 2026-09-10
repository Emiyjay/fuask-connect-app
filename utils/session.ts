import * as SecureStore from 'expo-secure-store'

type SessionExpiredHandler = () => void

let sessionExpiredHandler: SessionExpiredHandler | null = null
let clearingSession = false

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler
}

export async function clearSession() {
  if (clearingSession) return
  clearingSession = true

  try {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    sessionExpiredHandler?.()
  } finally {
    clearingSession = false
  }
}
