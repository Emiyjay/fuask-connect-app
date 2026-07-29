import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a7a3c'

type UserData = {
  displayName: string
  role: string
  department: string
  level: string
}

const SETTINGS_ROWS = [
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { key: 'privacy-security', label: 'Privacy and Security', icon: 'lock-closed-outline' },
  { key: 'appearance', label: 'Appearance', icon: 'color-palette-outline' },
  { key: 'ndpr', label: 'Data and NDPR Rights', icon: 'document-text-outline', route: '/privacy' },
  { key: 'about', label: 'About FUASK Connect', icon: 'information-circle-outline' },
] as const

export default function ProfileScreen() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      if (raw) setUser(JSON.parse(raw))
    })
  }, [])

  function handleRowPress(row: (typeof SETTINGS_ROWS)[number]) {
    if (row.route) {
      router.push(row.route as any)
    } else {
      Alert.alert(row.label, 'Coming soon.')
    }
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    router.replace('/login')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.name}>{user?.displayName || 'Loading…'}</Text>

      {user && (
        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{user.department}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{user.level}</Text></View>
          <View style={[styles.badge, styles.badgeRole]}><Text style={[styles.badgeText, styles.badgeRoleText]}>{user.role}</Text></View>
        </View>
      )}

      <View style={styles.settingsCard}>
        {SETTINGS_ROWS.map((row, i) => (
          <TouchableOpacity
            key={row.key}
            style={[styles.settingsRow, i === SETTINGS_ROWS.length - 1 && styles.settingsRowLast]}
            onPress={() => handleRowPress(row)}
          >
            <Ionicons name={row.icon as any} size={20} color={GREEN} style={styles.settingsIcon} />
            <Text style={styles.settingsLabel}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#c0392b" style={styles.settingsIcon} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 60 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 14 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  badge: { backgroundColor: '#eaf5ee', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', color: GREEN, textTransform: 'capitalize' },
  badgeRole: { backgroundColor: GREEN },
  badgeRoleText: { color: '#fff' },
  settingsCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsIcon: { marginRight: 14 },
  settingsLabel: { flex: 1, fontSize: 15, color: '#333' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 16 },
  logoutText: { fontSize: 15, color: '#c0392b', fontWeight: '600' }
})
