import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRequestCode() {
    if (!email) {
      Alert.alert('Missing email', 'Enter your email first')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      Alert.alert('Check your email', 'If that email is registered, a reset code has been sent.')
      setStep('reset')
    } catch (error: any) {
      Alert.alert('Something went wrong', error.response?.data?.error || 'Try again shortly')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!otp || !newPassword) {
      Alert.alert('Missing info', 'Enter the code and your new password')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword })
      Alert.alert('Password reset!', 'Please log in with your new password.')
      router.replace('/')
    } catch (error: any) {
      Alert.alert('Reset failed', error.response?.data?.error || 'Check your code and try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Logo />
      <Text style={styles.title}>Reset Password</Text>

      {step === 'request' ? (
        <>
          <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleRequestCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Enter the code and your new password</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>Back to <Text style={styles.backLink}>Log In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backRow: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 },
  backLink: { color: '#1a73e8', fontWeight: 'bold' }
})
