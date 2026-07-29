#!/bin/bash

# ── components/Logo.tsx (overwrite — uses real crest) ──
cat > components/Logo.tsx << 'EOF'
import { View, Image, StyleSheet } from 'react-native'

export default function Logo() {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 90, resizeMode: 'contain' }
})
EOF

# ── components/AuthBackground.tsx (new — watermark, ready to become a real slideshow) ──
cat > components/AuthBackground.tsx << 'EOF'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { View, Animated, StyleSheet, Dimensions, ScrollView } from 'react-native'

const { width, height } = Dimensions.get('window')
const WATERMARK_OPACITY = 0.1

// Add more images here later to turn this into a true rotating slideshow:
// require('../assets/images/campus-1.jpg'), require('../assets/images/campus-2.jpg'), ...
const SLIDES = [require('../assets/images/logo.png')]

export default function AuthBackground({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(WATERMARK_OPACITY)).current

  useEffect(() => {
    if (SLIDES.length <= 1) return
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setIndex(prev => (prev + 1) % SLIDES.length)
        Animated.timing(opacity, { toValue: WATERMARK_OPACITY, duration: 800, useNativeDriver: true }).start()
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <View style={styles.root}>
      <Animated.Image source={SLIDES[index]} style={[styles.bgImage, { opacity }]} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  bgImage: {
    width: width * 1.4,
    height: width * 1.4,
    position: 'absolute',
    resizeMode: 'contain',
    alignSelf: 'center',
    top: height * 0.15
  },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 }
})
EOF

# ── app/index.tsx (Login — wrapped in AuthBackground) ──
cat > app/index.tsx << 'EOF'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'

export default function LoginScreen() {
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
      Alert.alert('Welcome back!', `Logged in as ${data.displayName} (${data.role})`)
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

      <Text style={styles.footer}>App developed by John Emmanuel Sani</Text>
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
  footer: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 40 }
})
EOF

# ── app/register.tsx (wrapped in AuthBackground) ──
cat > app/register.tsx << 'EOF'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
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

  async function handleRegister() {
    if (!displayName || !matricNumber || !email || !password) {
      Alert.alert('Missing info', 'Please fill in every field')
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
      <Text style={styles.hint}>Contain not less than 8 characters, having uppercase, lowercase, number, and symbol</Text>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
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
  backLink: { color: GREEN, fontWeight: 'bold' }
})
EOF

# ── app/verify.tsx (wrapped in AuthBackground) ──
cat > app/verify.tsx << 'EOF'
import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'

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
    <AuthBackground>
      <Logo />
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>

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
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#222' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' },
  button: { backgroundColor: GREEN, borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendText: { color: GREEN, fontSize: 14 }
})
EOF

# ── app/forgot-password.tsx (wrapped in AuthBackground) ──
cat > app/forgot-password.tsx << 'EOF'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'
import Logo from '../components/Logo'
import AuthBackground from '../components/AuthBackground'

const GREEN = '#1a7a3c'

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
    <AuthBackground>
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
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Contain not less than 8 characters, having uppercase, lowercase, number, and symbol</Text>
          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>Back to <Text style={styles.backLink}>Log In</Text></Text>
      </TouchableOpacity>
    </AuthBackground>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#222' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 6, backgroundColor: '#fff' },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
  hint: { fontSize: 12, color: '#888', marginBottom: 16 },
  button: { backgroundColor: GREEN, borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backRow: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 },
  backLink: { color: GREEN, fontWeight: 'bold' }
})
EOF

echo "✅ Real logo + background watermark wired into all 4 auth screens"
