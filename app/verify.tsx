import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'

export default function VerifyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(params.email || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleVerify() {
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.replace(/\D/g, '')
    if (!cleanEmail || cleanOtp.length !== 6) {
      Alert.alert('Check your details', 'Enter your email and the 6-digit verification code.')
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const response = await api.post('/auth/verify', { email: cleanEmail, otp: cleanOtp })
      const { data } = response.data
      Alert.alert('Email verified', `Welcome, ${data?.displayName || 'FUASK Connect user'}. You can now log in.`)
      router.replace('/login')
    } catch (error: any) {
      const status = error.response?.status
      const message = error.response?.data?.error || 'Verification failed. Check your connection and try again.'
      Alert.alert(status === 429 ? 'Too many attempts' : 'Verification failed', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      Alert.alert('Missing email', 'Enter your email first.')
      return
    }
    if (resending) return
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { email: cleanEmail })
      Alert.alert('New code sent', 'Check your email for the new 6-digit verification code.')
    } catch (error: any) {
      Alert.alert('Could not resend', error.response?.data?.error || 'Try again shortly.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <Logo />
        <Text style={styles.step}>ACCOUNT VERIFICATION</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>Confirm your email address to activate your verified FUASK Connect account.</Text>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9aa29d"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading && !resending}
          accessibilityLabel="Email address"
        />

        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={[styles.input, styles.otpInput]}
          placeholder="000000"
          placeholderTextColor="#b1b8b4"
          value={otp}
          onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          textContentType="oneTimeCode"
          accessibilityLabel="6-digit verification code"
        />
        <Text style={styles.helper}>Enter the code sent to your email. Codes are time-limited.</Text>

        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleVerify} disabled={loading} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Verify email">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Email</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending || loading} style={styles.resendButton} accessibilityRole="button" accessibilityLabel="Resend verification code">
          {resending ? <ActivityIndicator size="small" color={GREEN} /> : <Text style={styles.resendText}>Didn't receive a code? Resend</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading || resending} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to login">
          <Text style={styles.backText}>Back to <Text style={styles.backLink}>Log In</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  keyboard: { width: '100%' },
  step: { textAlign: 'center', color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 2, marginBottom: 7 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19, marginBottom: 25 },
  label: { fontSize: 12, fontWeight: '700', color: '#4b5650', marginBottom: 7, marginLeft: 2 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, paddingHorizontal: 14, marginBottom: 15, fontSize: 15, backgroundColor: '#fff', color: TEXT },
  otpInput: { textAlign: 'center', fontSize: 21, fontWeight: '800', letterSpacing: 5 },
  helper: { color: '#8a938e', fontSize: 11, lineHeight: 16, marginTop: -5, marginBottom: 18 },
  button: { minHeight: 52, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resendButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  resendText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  backButton: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#6f7974', fontSize: 13 },
  backLink: { color: GREEN, fontWeight: '800' }
})
