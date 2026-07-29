
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'

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
    if (!displayName || !matricNumber || !email || !password) {
      Alert.alert('Missing info', 'Please fill in every field')
      return
    }
    if (!agreedToTerms) {
      Alert.alert('Agreement required', 'Please agree to the Privacy Policy and Terms of Service to continue')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register/student', { displayName, matricNumber, email, password })
      Alert.alert('Account created!', 'Check your email for a 6-digit verification code.')
      router.push({ pathname: '/verify', params: { email } })
    } catch (error: any) {
      const message = error.response?.data?.error || 'Something went wrong. Check your connection.'
      Alert.alert('Registration failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <Logo />
      <Text style={styles.title}>Get Started With FUASK Connect</Text>
      <Text style={styles.subtitle}>Create an account to connect with other FUASK students, share ideas, and access the right information and materials.</Text>

      <Text style={styles.sectionLabel}>Kindly Fill In Your School Details</Text>

      <TextInput style={styles.input} placeholder="Full name" value={displayName} onChangeText={setDisplayName} />
      <TextInput
        style={styles.input}
        placeholder="Matric number"
        value={matricNumber}
        onChangeText={setMatricNumber}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Create password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>
     <PasswordStrengthMeter password={password} />
      <Text style={styles.hint}>Contain not less than 8 characters, having uppercase, lowercase, number, and symbol</Text>
 
      <View style={styles.checkboxRow}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          {agreedToTerms && <View style={styles.checkboxInner} />}
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          I agree to the{' '}
          <Link href="/privacy" asChild>
            <Text style={styles.checkboxLink}>Privacy Policy</Text>
          </Link>
          {' '}and{' '}
          <Link href="/terms" asChild>
            <Text style={styles.checkboxLink}>Terms of Service</Text>
          </Link>
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      
       <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backRow}>
        <Text style={styles.backText}>Already have an account? <Text style={styles.backLink}>Log In</Text></Text>
      </TouchableOpacity>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#222' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 6, backgroundColor: '#fff' },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  hint: { fontSize: 12, color: '#888', marginBottom: 24 },
  button: { backgroundColor: GREEN, borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backRow: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 },
  backLink: { color: GREEN, fontWeight: 'bold' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: GREEN, marginRight: 10, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 2, backgroundColor: GREEN },
  checkboxText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },
  checkboxLink: { color: GREEN, fontWeight: '600' }
})

