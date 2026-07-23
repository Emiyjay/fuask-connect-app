import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, data } = response.data
      await SecureStore.setItemAsync('token', token)
      Alert.alert('Welcome back!', `Logged in as ${data.displayName} (${data.role})`)
    } catch (error: any) {
      const message = error.response?.data?.error || 'Something went wrong. Check your connection.'
      Alert.alert('Login failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Logo />
      <Text style={styles.title}>FUASK Connect</Text>
      <Text style={styles.subtitle}>Log in to your account</Text>

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
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <Link href="/forgot-password" asChild>
        <TouchableOpacity>
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <Link href="/register" asChild>
          <TouchableOpacity>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Text style={styles.footer}>App developed by John Emmanuel Sani</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 8 },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  link: { color: '#1a73e8', textAlign: 'right', marginBottom: 24, fontSize: 14 },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { color: '#666', fontSize: 14 },
  signupLink: { color: '#1a73e8', fontSize: 14, fontWeight: 'bold' },
  footer: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 40 }
})
