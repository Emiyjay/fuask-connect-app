import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a7a3c'

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'About FUASK Connect' }} />
      <View style={styles.hero}>
        <View style={styles.logo}><Ionicons name="school-outline" size={30} color="#fff" /></View>
        <Text style={styles.title}>FUASK Connect</Text>
        <Text style={styles.subtitle}>A verified digital campus community for FUAS students.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Built for the campus</Text>
        <Text style={styles.body}>FUASK Connect brings academic resources, campus communication, student communities, marketplace activity, secure messaging, timetables, and Lost & Found into one institution-focused platform.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Core features</Text>
        {['Verified student identity', 'Cohort and campus communities', 'Secure end-to-end encrypted messaging', 'Learning materials and resources', 'Timetable and exam information', 'Campus marketplace', 'Lost & Found'].map((item) => (
          <View style={styles.feature} key={item}><Ionicons name="checkmark-circle" size={18} color={GREEN} /><Text style={styles.featureText}>{item}</Text></View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Your privacy matters</Text>
        <Text style={styles.body}>Messages are encrypted on your device before they are sent. The server stores the encrypted message payload rather than the plaintext message.</Text>
      </View>
      <Text style={styles.version}>FUASK Connect · Version 1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, paddingBottom: 40 },
  hero: { backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 14 },
  logo: { width: 62, height: 62, borderRadius: 18, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#222' },
  subtitle: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 19, marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 12 },
  heading: { fontSize: 16, fontWeight: '800', color: '#222', marginBottom: 8 },
  body: { fontSize: 13, color: '#666', lineHeight: 20 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  featureText: { flex: 1, fontSize: 13, color: '#555' },
  version: { textAlign: 'center', color: '#aaa', fontSize: 11, marginTop: 4 }
})
