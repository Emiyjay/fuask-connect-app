import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import { ensureKeysRegistered } from '../utils/crypto'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'

export default function LoginScreen() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    const cleanIdentifier = identifier.trim()

    if (!cleanIdentifier || !password) {
      Alert.alert('Missing information', 'Enter your matric number and password to continue.')
      return
    }

    if (loading) return
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        identifier: cleanIdentifier,
        password
      })
      const { token, data } = response.data

      if (!token || !data) {
        throw new Error('Invalid login response')
      }

      await SecureStore.setItemAsync('token', token)
      await SecureStore.setItemAsync('user', JSON.stringify(data))
      await ensureKeysRegistered(token)
      router.replace('/home')
    } catch (error: any) {
      const status = error.response?.status
      const message = error.response?.data?.error
        || (status === 429 ? 'Too many login attempts. Please wait a moment and try again.' : 'Something went wrong. Check your connection and try again.')
      Alert.alert(status === 401 ? 'Incorrect login details' : 'Login failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <Logo />
        <Text style={styles.eyebrow}>VERIFIED CAMPUS NETWORK</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your verified FUASK Connect account.</Text>

        <Text style={styles.label}>Matric number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. FUASK/CS/24/001"
          placeholderTextColor="#9aa29d"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="next"
          accessibilityLabel="Matric number"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#9aa29d"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            accessibilityLabel="Password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((visible) => !visible)}
            style={styles.eyeButton}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={21} color={MUTED} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <Link href="/forgot-password" asChild>
          <TouchableOpacity disabled={loading} accessibilityRole="link" accessibilityLabel="Forgot password">
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>NEW TO FUASK CONNECT?</Text>
          <View style={styles.divider} />
        </View>

        <Link href="/register" asChild>
          <TouchableOpacity style={styles.outlineButton} disabled={loading} accessibilityRole="button" accessibilityLabel="Create a new account">
            <Text style={styles.outlineButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.footerLinks}>
          <Link href="/privacy" asChild>
            <TouchableOpacity accessibilityRole="link"><Text style={styles.footerLink}>Privacy</Text></TouchableOpacity>
          </Link>
          <Text style={styles.footerDivider}>•</Text>
          <Link href="/terms" asChild>
            <TouchableOpacity accessibilityRole="link"><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  keyboard: { width: '100%' },
  eyebrow: { textAlign: 'center', color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 2, marginBottom: 7 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: '#4b5650', marginBottom: 7, marginLeft: 2 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, paddingHorizontal: 14, marginBottom: 15, fontSize: 15, backgroundColor: '#fff', color: TEXT },
  passwordWrapper: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, marginBottom: 18, backgroundColor: '#fff' },
  passwordInput: { flex: 1, minHeight: 52, paddingHorizontal: 14, fontSize: 15, color: TEXT },
  eyeButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 52, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  link: { color: GREEN, textAlign: 'center', marginTop: 17, fontSize: 13, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  divider: { flex: 1, height: 1, backgroundColor: '#e2e7e4' },
  dividerText: { color: '#9aa39e', fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginHorizontal: 9 },
  outlineButton: { minHeight: 52, borderWidth: 1.5, borderColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  outlineButtonText: { color: GREEN, fontSize: 15, fontWeight: '800' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 27 },
  footerLink: { color: '#7d8781', fontSize: 11, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 4 },
  footerDivider: { color: '#c7cec9', fontSize: 11, marginHorizontal: 7 }
})
