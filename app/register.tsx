import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'

export default function RegisterScreen() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [matricNumber, setMatricNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  async function handleRegister() {
    const cleanName = displayName.trim().replace(/\s+/g, ' ')
    const cleanMatric = matricNumber.trim().toUpperCase()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName || !cleanMatric || !cleanEmail || !password) {
      Alert.alert('Missing information', 'Complete all required fields to create your account.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters with uppercase, lowercase, number, and symbol.')
      return
    }
    if (!agreedToTerms) {
      Alert.alert('Agreement required', 'Please agree to the Privacy Policy and Terms of Service to continue.')
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await api.post('/auth/register/student', { displayName: cleanName, matricNumber: cleanMatric, email: cleanEmail, password })
      Alert.alert('Account created', 'Check your email for a 6-digit verification code.')
      router.push({ pathname: '/verify', params: { email: cleanEmail } })
    } catch (error: any) {
      const status = error.response?.status
      const message = error.response?.data?.error || 'Something went wrong. Check your connection and try again.'
      Alert.alert(status === 409 ? 'Account already exists' : 'Registration failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <Logo />
        <Text style={styles.step}>VERIFIED CAMPUS ACCOUNT</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join FUASK Connect with your institutional identity. Your details help place you in the correct campus groups.</Text>

        <Text style={styles.sectionLabel}>School details</Text>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#9aa29d" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" autoCorrect={false} editable={!loading} accessibilityLabel="Full name" />
        <Text style={styles.label}>Matric number</Text>
        <TextInput style={styles.input} placeholder="e.g. FUASK/CS/24/001" placeholderTextColor="#9aa29d" value={matricNumber} onChangeText={setMatricNumber} autoCapitalize="characters" autoCorrect={false} editable={!loading} accessibilityLabel="Matric number" />
        <Text style={styles.label}>Email address</Text>
        <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#9aa29d" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!loading} accessibilityLabel="Email address" />

        <Text style={styles.label}>Create password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput style={styles.passwordInput} placeholder="Choose a strong password" placeholderTextColor="#9aa29d" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!loading} accessibilityLabel="Create password" />
          <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} style={styles.eyeButton} disabled={loading} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={21} color={MUTED} />
          </TouchableOpacity>
        </View>
        <PasswordStrengthMeter password={password} />
        <Text style={styles.hint}>At least 8 characters with uppercase, lowercase, number, and symbol.</Text>

        <View style={styles.checkboxRow}>
          <TouchableOpacity style={[styles.checkbox, agreedToTerms && styles.checkboxSelected]} onPress={() => setAgreedToTerms((agreed) => !agreed)} disabled={loading} accessibilityRole="checkbox" accessibilityLabel="Agree to Privacy Policy and Terms of Service" accessibilityState={{ checked: agreedToTerms }}>
            {agreedToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            I agree to the <Link href="/privacy" asChild><Text style={styles.checkboxLink}>Privacy Policy</Text></Link> and <Link href="/terms" asChild><Text style={styles.checkboxLink}>Terms of Service</Text></Link>.
          </Text>
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Create account" accessibilityState={{ disabled: loading, busy: loading }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Go to login">
          <Text style={styles.backText}>Already have an account? <Text style={styles.backLink}>Log In</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  keyboard: { width: '100%' },
  step: { textAlign: 'center', color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 2, marginBottom: 7 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 7, color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, lineHeight: 19, textAlign: 'center', marginBottom: 23 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#3e4943', marginBottom: 13 },
  label: { fontSize: 12, fontWeight: '700', color: '#4b5650', marginBottom: 7, marginLeft: 2 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, paddingHorizontal: 14, marginBottom: 13, fontSize: 15, backgroundColor: '#fff', color: TEXT },
  passwordWrapper: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d7ded9', borderRadius: 12, marginBottom: 5, backgroundColor: '#fff' },
  passwordInput: { flex: 1, minHeight: 50, paddingHorizontal: 14, fontSize: 15, color: TEXT },
  eyeButton: { minWidth: 52, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 11, color: '#89928d', lineHeight: 16, marginTop: 4, marginBottom: 17 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: GREEN, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxSelected: { backgroundColor: GREEN },
  checkboxText: { flex: 1, fontSize: 12, color: '#59645e', lineHeight: 18 },
  checkboxLink: { color: GREEN, fontWeight: '700' },
  button: { minHeight: 52, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  backRow: { alignItems: 'center', paddingVertical: 10 },
  backText: { color: '#6f7974', fontSize: 13 },
  backLink: { color: GREEN, fontWeight: '800' }
})
