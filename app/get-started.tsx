import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a7a3c'

const FEATURES = [
  { key: 'verified', icon: 'shield-checkmark-outline', label: 'Verified Identity' },
  { key: 'realtime', icon: 'notifications-outline', label: 'Real-time Updates' },
  { key: 'community', icon: 'people-outline', label: 'Your Community' },
] as const

export default function LandingScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>FUASK Connect</Text>
      <Text style={styles.tagline}>Your Campus. Verified. Connected.</Text>

      <View style={styles.featureRow}>
        {FEATURES.map((f) => (
          <View key={f.key} style={styles.featureItem}>
            <View style={styles.featureIconCircle}>
              <Ionicons name={f.icon as any} size={22} color={GREEN} />
            </View>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/register')}>
        <Text style={styles.primaryButtonText}>Register as Student</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.outlineButton}
        onPress={() => Alert.alert('Staff Registration', 'Coming soon.')}
      >
        <Text style={styles.outlineButtonText}>Register as Staff</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Login</Text></Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#222', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#777', marginBottom: 32 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  featureItem: { alignItems: 'center', flex: 1 },
  featureIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureLabel: { fontSize: 11, color: '#555', textAlign: 'center', fontWeight: '600' },
  primaryButton: { backgroundColor: GREEN, borderRadius: 8, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineButton: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 8, paddingVertical: 16, width: '100%', alignItems: 'center' },
  outlineButtonText: { color: GREEN, fontSize: 16, fontWeight: '700' },
  loginRow: { marginTop: 24 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: GREEN, fontWeight: '700' }
})
