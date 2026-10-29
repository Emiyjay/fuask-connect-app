import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#38D39F'
const HIERARCHY_ORDER = ['school', 'faculty', 'department', 'cohort']

type UserData = {
  displayName: string
  role: string
  department: string
  level: string
}

type GroupItem = {
  id: string
  name: string
  type: string
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
  const [academicChain, setAcademicChain] = useState<GroupItem[]>([])

  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      if (raw) setUser(JSON.parse(raw))
    })

    SecureStore.getItemAsync('token').then(async (token) => {
      if (!token) return
      try {
        const res = await api.get('/groups/mine', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const groups: GroupItem[] = res.data.data || []
        const chain = HIERARCHY_ORDER
          .map((type) => groups.find((g) => g.type === type))
          .filter((g): g is GroupItem => Boolean(g))
        setAcademicChain(chain)
      } catch {
        // silently skip — profile still works without the breadcrumb
      }
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
      <View style={styles.profileHeading}>
        <Text style={styles.profileTitle}>Your Profile</Text>
        <Text style={styles.profileSubtitle}>Your identity in the FUASK community</Text>
      </View>
      <View style={styles.identityPanel}>
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
      </View>

      {academicChain.length > 0 && (
        <View style={styles.breadcrumbCard}>
          {academicChain.map((g, i) => (
            <View key={g.id} style={styles.breadcrumbRow}>
              <Text style={styles.breadcrumbText}>{g.name}</Text>
              {i < academicChain.length - 1 && (
                <Ionicons name="chevron-down" size={14} color="#ccc" style={styles.breadcrumbArrow} />
              )}
            </View>
          ))}
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
  container: { flex: 1, backgroundColor: '#07110E' },
  content: { padding: 20, paddingBottom: 60 },
  profileHeading: { width: '100%', marginBottom: 18 },
  profileTitle: { fontSize: 23, fontWeight: '800', color: '#E8F5ED', letterSpacing: -0.5 },
  profileSubtitle: { fontSize: 11, color: '#9BB7AA', marginTop: 4 },
  identityPanel: { width: '100%', alignItems: 'center', padding: 20, borderRadius: 20, backgroundColor: '#0E3A2C', borderWidth: 1, borderColor: '#23634A', marginBottom: 20 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 14 },
  avatarText: { color: '#07110E', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#E8F5ED', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { backgroundColor: '#12271D', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#D5E7DC', textTransform: 'capitalize' },
  badgeRole: { backgroundColor: GREEN },
  badgeRoleText: { color: '#07110E' },
  breadcrumbCard: { width: '100%', backgroundColor: '#0D1B16', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F3A2E', marginBottom: 20 },
  breadcrumbRow: { alignItems: 'center' },
  breadcrumbText: { fontSize: 13, color: '#B6CEC1', fontWeight: '600', textAlign: 'center' },
  breadcrumbArrow: { marginVertical: 2 },
  settingsCard: { width: '100%', backgroundColor: '#0D1B16', borderRadius: 12, borderWidth: 1, borderColor: '#1F3A2E', marginBottom: 20 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F3A2E' },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsIcon: { marginRight: 14 },
  settingsLabel: { flex: 1, fontSize: 15, color: '#D5E7DC' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#0D1B16', borderRadius: 12, borderWidth: 1, borderColor: '#1F3A2E', padding: 16 },
  logoutText: { fontSize: 15, color: '#c0392b', fontWeight: '600' }
})
