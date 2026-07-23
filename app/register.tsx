import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'

export default function RegisterScreen() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [matricNumber, setMatricNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!displayName || !matricNumber || !email || !password) {
      Alert.alert('Missing info', 'Please fill in every field')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters')
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
    <ScrollView contentContainerStyle={styles.container}>
      <Logo />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Register as a FUASK student</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={displayName} onChangeText={setDisplayName} />
      <TextInput
        style={styles.input}
        placeholder="Matric Number (e.g. FUAS/CPC/CSE/25/0041)"
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
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>Already have an account? <Text style={styles.backLink}>Log In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 24 },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backRow: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 },
  backLink: { color: '#1a73e8', fontWeight: 'bold' }
})
