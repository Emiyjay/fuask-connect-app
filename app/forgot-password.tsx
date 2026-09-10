import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRequestCode() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      Alert.alert('Missing email', 'Enter the email address linked to your account.')
      return
    }
    if (loading) return
    setEmail(cleanEmail)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: cleanEmail })
      Alert.alert('Check your email', 'If that email is registered, a reset code has been sent.')
      setStep('reset')
    } catch (error: any) {
      Alert.alert('Could not send code', error.response?.data?.error || 'Try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    const cleanOtp = otp.replace(/\D/g, '')
    if (cleanOtp.length !== 6 || !newPassword) {
      Alert.alert('Check your details', 'Enter the 6-digit code and a new password.')
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp: cleanOtp, newPassword })
      Alert.alert('Password reset', 'Your password has been changed. Please log in with your new password.')
      router.replace('/login')
    } catch (error: any) {
      Alert.alert('Reset failed', error.response?.data?.error || 'Check your code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <Logo />
        <Text style={styles.step}>{step === 'request' ? 'ACCOUNT RECOVERY' : 'SECURE PASSWORD RESET'}</Text>
        <Text style={styles.title}>Reset your password</Text>

        {step === 'request' ? (
          <>
            <Text style={styles.subtitle}>We'll send a one-time code to the email address associated with your FUASK Connect account.</Text>
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
              editable={!loading}
              onSubmitEditing={handleRequestCode}
              accessibilityLabel="Account email address"
            />
            <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleRequestCode} disabled={loading} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Send password reset code">
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {email} and choose a new password.</Text>
            <Text style={styles.label}>Reset code</Text>
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
              accessibilityLabel="6-digit password reset code"
            />
            <Text style={styles.label}>New password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a new password"
                placeholderTextColor="#9aa29d"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="New password"
              />
              <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} style={styles.eyeButton} disabled={loading} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide new password' : 'Show new password'}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={21} color={MUTED} />
              </TouchableOpacity>
            </View>
            <PasswordStrengthMeter password={newPassword} />
            <Text style={styles.hint}>Use at least 8 characters with uppercase, lowercase, number, and symbol.</Text>
            <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Reset password">
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('request')} disabled={loading} style={styles.resendButton} accessibilityRole="button" accessibilityLabel="Request another reset code">
              <Text style={styles.resendText}>Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Back to login">
          <Text style={styles.backText}>Back to <Text style={styles.backLink}>Log In</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  keyboard: { width: '100%' },
  step: { textAlign: 'center', color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 2, marginBottom: 7 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19, marginBottom: 25 },
  label: { fontSize: 12, fontWeight: '700', color: '#4b5650', marginBottom: 7, marginLeft: 2 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, paddingHorizontal: 14, marginBottom: 15, fontSize: 15, backgroundColor: '#fff', color: TEXT },
  otpInput: { textAlign: 'center', fontSize: 21, fontWeight: '800', letterSpacing: 5 },
  passwordWrapper: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  passwordInput: { flex: 1, minHeight: 52, paddingHorizontal: 14, fontSize: 15, color: TEXT },
  eyeButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 11, color: '#89928d', lineHeight: 16, marginBottom: 17, marginTop: 5 },
  button: { minHeight: 52, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resendButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resendText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  backRow: { alignItems: 'center', paddingVertical: 8, marginTop: 2 },
  backText: { color: '#6f7974', fontSize: 13 },
  backLink: { color: GREEN, fontWeight: '800' }
})
