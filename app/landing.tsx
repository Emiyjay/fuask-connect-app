import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const DARK_GREEN = '#1a4d2e'
const GREEN = '#1a7a3c'

export default function LandingScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobTopRight]} />

      <View style={styles.content}>
        <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkDark}>Fuask</Text>
          <View style={styles.wordmarkLightRow}>
            <Text style={styles.wordmarkLight}>Connect</Text>
            <View style={styles.chatBubble}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.tagline}>One University. One App. One Community.</Text>
        <Text style={styles.subtitle}>Stay updated, stay connected and stay ahead with everything FUASK.</Text>
      </View>

      <View style={styles.photoWrap}>
        {/* Replace with a real photo of the FUASK campus at assets/images/campus.jpg */}
        <Image source={require('../assets/images/campus.jpg')} style={styles.photo} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.photoFade}
        />
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.getStartedButton} onPress={() => router.push('/get-started')}>
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.createRow}>
          <Text style={styles.createText}>
            New here? <Text style={styles.createLink}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomWave}>
        <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.5)" style={styles.sparkle} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 300, backgroundColor: '#eaf5ee' },
  blobTopLeft: { width: 220, height: 220, top: -80, left: -80 },
  blobTopRight: { width: 180, height: 180, top: -60, right: -90 },
  content: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 24 },
  logo: { width: 130, height: 130, marginBottom: 20 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmarkDark: { fontSize: 34, fontWeight: '800', color: DARK_GREEN },
  wordmarkLightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordmarkLight: { fontSize: 34, fontWeight: '800', color: GREEN },
  chatBubble: { width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginLeft: 2, marginTop: 2 },
  divider: { width: 36, height: 3, backgroundColor: GREEN, borderRadius: 2, marginVertical: 14 },
  tagline: { fontSize: 15, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },
  photoWrap: { height: 220, marginTop: 24 },
  photo: { width: '100%', height: '100%' },
  photoFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  bottomSection: { paddingHorizontal: 24, paddingTop: 10 },
  getStartedButton: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 10, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  getStartedText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  createRow: { alignItems: 'center', marginTop: 16 },
  createText: { fontSize: 13, color: '#666' },
  createLink: { color: GREEN, fontWeight: '700' },
  bottomWave: { height: 60, backgroundColor: DARK_GREEN, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: 20, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 30 },
  sparkle: {}
})
