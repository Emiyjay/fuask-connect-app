import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'

export default function LoginScreen() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!identifier || !password) {
      Alert.alert('Missing info', 'Please enter your matric number and password')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { identifier, password })
      const { token, data } = response.data
      await SecureStore.setItemAsync('token', token)
      await SecureStore.setItemAsync('user', JSON.stringify(data))
      router.replace('/home')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Something went wrong. Check your connection.'
      Alert.alert('Login failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <Logo />
      <Text style={styles.title}>Login To FUASK Connect</Text>

      <TextInput
        style={styles.input}
        placeholder="Matric No."
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="characters"
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>

      <Link href="/forgot-password" asChild>
        <TouchableOpacity>
          <Text style={styles.link}>Forgotten Password?</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/register" asChild>
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Create New Account</Text>
        </TouchableOpacity>
      </Link>

      <View style={styles.footerLinks}>
        <Link href="/privacy" asChild>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </Link>
        <Text style={styles.footerDivider}>•</Text>
        <Link href="/terms" asChild>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 28, color: '#222' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, backgroundColor: '#fff' },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  button: { backgroundColor: GREEN, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: GREEN, textAlign: 'center', marginTop: 18, fontSize: 14, fontWeight: '500' },
  outlineButton: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 32, backgroundColor: '#fff' },
  outlineButtonText: { color: GREEN, fontSize: 16, fontWeight: 'bold' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  footerLink: { color: '#888', fontSize: 12, fontWeight: '500' },
  footerDivider: { color: '#ccc', fontSize: 12, marginHorizontal: 8 }
})
