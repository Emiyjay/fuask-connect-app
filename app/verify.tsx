import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import api from '../config/api'
import Logo from '../components/Logo'

export default function VerifyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(params.email || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleVerify() {
    if (!email || !otp) {
      Alert.alert('Missing info', 'Enter your email and the 6-digit code')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/verify', { email, otp })
      const { data } = response.data
      Alert.alert('Account verified!', `Welcome, ${data.displayName}. Please log in.`)
      router.replace('/')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Verification failed. Check your connection.'
      Alert.alert('Verification failed', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) {
      Alert.alert('Missing email', 'Enter your email first')
      return
    }
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { email })
      Alert.alert('Code sent', 'Check your email for a new code')
    } catch (error: any) {
      Alert.alert('Failed to resend', error.response?.data?.error || 'Try again shortly')
    } finally {
      setResending(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Logo />
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code we sent you</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendRow}>
        <Text style={styles.resendText}>{resending ? 'Sending...' : "Didn't get a code? Resend"}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#1a73e8', fontSize: 14 }
})
