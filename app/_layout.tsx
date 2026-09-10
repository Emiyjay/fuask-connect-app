import 'react-native-get-random-values'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native'
import { Stack, usePathname, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { setSessionExpiredHandler } from '../utils/session'

const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/verify',
  '/forgot-password',
  '/privacy',
  '/terms',
])

const ONBOARDING_ROUTES = new Set([
  '/',
  '/index',
  '/landing',
  '/get-started',
])

export default function RootLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    setSessionExpiredHandler(() => router.replace('/login'))
    return () => setSessionExpiredHandler(null)
  }, [router])

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const token = await SecureStore.getItemAsync('token')
        if (!active) return

        const isPublicRoute = PUBLIC_ROUTES.has(pathname)
        const isOnboardingRoute = ONBOARDING_ROUTES.has(pathname)

        if (!token && !isPublicRoute && !isOnboardingRoute) {
          router.replace('/login')
          return
        }

        if (token && (isOnboardingRoute || pathname === '/login' || pathname === '/register')) {
          router.replace('/home')
          return
        }

        setCheckingSession(false)
      } catch {
        if (!active) return
        if (!PUBLIC_ROUTES.has(pathname) && !ONBOARDING_ROUTES.has(pathname)) {
          router.replace('/login')
          return
        }
        setCheckingSession(false)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [pathname, router])

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen} accessibilityRole="progressbar" accessibilityLabel="Checking your session">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="small" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#fff' } }} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
})
