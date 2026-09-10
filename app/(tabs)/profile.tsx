import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'
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
  { key: 'notifications', label: 'Notifications', description: 'Messages and important campus updates', icon: 'notifications-outline' },
  { key: 'privacy-security', label: 'Privacy and Security', description: 'How your account and data are protected', icon: 'lock-closed-outline' },
  { key: 'appearance', label: 'Appearance', description: 'App display preferences', icon: 'color-palette-outline' },
  { key: 'ndpr', label: 'Data and NDPR Rights', description: 'Privacy policy and data requests', icon: 'document-text-outline', route: '/privacy' },
  { key: 'terms', label: 'Terms of Service', description: 'Rules for using FUASK Connect', icon: 'shield-checkmark-outline', route: '/terms' },
  { key: 'about', label: 'About FUASK Connect', description: 'Product information', icon: 'information-circle-outline' },
] as const

export default function ProfileScreen() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [academicChain, setAcademicChain] = useState<GroupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync('user')
      if (raw) {
        try {
          setUser(JSON.parse(raw) as UserData)
        } catch {
          await SecureStore.deleteItemAsync('user')
          setUser(null)
        }
      } else {
        setUser(null)
      }

      const token = await SecureStore.getItemAsync('token')
      if (!token) {
        router.replace('/login')
        return
      }

      const res = await api.get('/groups/mine', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const groups: GroupItem[] = Array.isArray(res.data?.data) ? res.data.data : []
      const chain = HIERARCHY_ORDER
        .map((type) => groups.find((g) => g.type === type))
        .filter((g): g is GroupItem => Boolean(g))
      setAcademicChain(chain)
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setAcademicChain([])
      }
    }
  }, [router])

  useFocusEffect(
    useCallback(() => {
      let active = true
      setLoading(true)
      loadProfile().finally(() => {
        if (active) setLoading(false)
      })
      return () => {
        active = false
      }
    }, [loadProfile])
  )

  async function onRefresh() {
    setRefreshing(true)
    try {
      await loadProfile()
    } finally {
      setRefreshing(false)
    }
  }

  function handleRowPress(row: (typeof SETTINGS_ROWS)[number]) {
    if (row.route) {
      router.push(row.route as any)
      return
    }

    if (row.key === 'privacy-security') {
      Alert.alert(
        'Privacy and Security',
        'Your session uses authenticated API requests, your password is never stored in the app, and private message content is protected by end-to-end encryption. Log out when using a shared device.'
      )
      return
    }

    if (row.key === 'notifications') {
      Alert.alert('Notifications', 'Push notification preferences are controlled by the notification features currently available on your device.')
      return
    }

    if (row.key === 'appearance') {
      Alert.alert('Appearance', 'FUASK Connect currently follows its built-in campus interface. Additional appearance controls can be added without changing your account data.')
      return
    }

    Alert.alert('About FUASK Connect', 'A verified campus platform for FUAS(K) students and staff.\n\nYour institutional identity determines the groups and campus content available to your account.')
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      const token = await SecureStore.getItemAsync('token')
      if (token) {
        try {
          await api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch {
          // Local logout must still complete if the network is unavailable.
        }
      }
    } finally {
      await SecureStore.deleteItemAsync('token')
      await SecureStore.deleteItemAsync('user')
      router.replace('/login')
    }
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—'

  if (loading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHero}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.verifiedMark}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </View>
        </View>
        <Text style={styles.name}>{user?.displayName || 'FUASK student'}</Text>
        <View style={styles.verifiedLine}>
          <Ionicons name="shield-checkmark" size={14} color={GREEN} />
          <Text style={styles.identityText}>Verified FUASK account</Text>
        </View>

        {user && (
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{user.department}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{user.level}</Text></View>
            <View style={[styles.badge, styles.badgeRole]}><Text style={[styles.badgeText, styles.badgeRoleText]}>{user.role}</Text></View>
          </View>
        )}
      </View>

      <View style={styles.securityCard}>
        <View style={styles.securityIconBox}>
          <Ionicons name="shield-checkmark-outline" size={22} color={GREEN} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Account protected</Text>
          <Text style={styles.securityText}>Institutional identity, authenticated sessions and secure messaging are active.</Text>
        </View>
        <Ionicons name="checkmark-circle" size={21} color={GREEN} />
      </View>

      {academicChain.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic identity</Text>
          <View style={styles.breadcrumbCard}>
            {academicChain.map((g, i) => (
              <View key={g.id} style={styles.breadcrumbRow}>
                <View style={styles.breadcrumbDot} />
                <Text style={styles.breadcrumbText}>{g.name}</Text>
                {i < academicChain.length - 1 && <Ionicons name="chevron-down" size={14} color="#b7c0ba" style={styles.breadcrumbArrow} />}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          {SETTINGS_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.settingsRow, i === SETTINGS_ROWS.length - 1 && styles.settingsRowLast]}
              onPress={() => handleRowPress(row)}
              disabled={loggingOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              accessibilityHint={row.description}
              hitSlop={{ top: 3, bottom: 3 }}
            >
              <View style={styles.settingsIconBox}>
                <Ionicons name={row.icon as any} size={19} color={GREEN} />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={styles.settingsLabel}>{row.label}</Text>
                <Text style={styles.settingsDescription}>{row.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#b7bfba" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutRow}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        hitSlop={{ top: 5, bottom: 5 }}
      >
        <Ionicons name="log-out-outline" size={20} color="#c0392b" style={styles.settingsIcon} />
        <Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
        {loggingOut && <ActivityIndicator size="small" color="#c0392b" />}
      </TouchableOpacity>

      <Text style={styles.versionText}>FUASK Connect · Verified campus network</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: MUTED, fontSize: 13 },
  content: { padding: 18, paddingBottom: 54 },
  profileHero: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e7ece9', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 18, marginBottom: 14 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 27, fontWeight: '800' },
  verifiedMark: { position: 'absolute', right: -2, bottom: 0, width: 25, height: 25, borderRadius: 13, backgroundColor: GREEN, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center' },
  verifiedLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  identityText: { fontSize: 12, color: MUTED },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 14 },
  badge: { backgroundColor: '#eaf5ee', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: GREEN, textTransform: 'capitalize' },
  badgeRole: { backgroundColor: GREEN },
  badgeRoleText: { color: '#fff' },
  securityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef8f1', borderWidth: 1, borderColor: '#d8eddf', borderRadius: 16, padding: 13, marginBottom: 22 },
  securityIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  securityCopy: { flex: 1, paddingRight: 8 },
  securityTitle: { fontSize: 13, fontWeight: '800', color: '#205c37', marginBottom: 2 },
  securityText: { fontSize: 11, lineHeight: 16, color: '#547160' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#59636a', marginBottom: 8, marginLeft: 3 },
  breadcrumbCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e7ece9', padding: 14 },
  breadcrumbRow: { alignItems: 'center', position: 'relative' },
  breadcrumbDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN, marginBottom: 3 },
  breadcrumbText: { fontSize: 13, color: '#465159', fontWeight: '600', textAlign: 'center' },
  breadcrumbArrow: { marginVertical: 3 },
  settingsCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e7ece9', overflow: 'hidden' },
  settingsRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eff2f0' },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingsCopy: { flex: 1, paddingRight: 10 },
  settingsIcon: { marginRight: 14 },
  settingsLabel: { fontSize: 14, fontWeight: '700', color: '#343e45', marginBottom: 2 },
  settingsDescription: { fontSize: 11, lineHeight: 15, color: '#8a9299' },
  logoutRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f0dddd', paddingHorizontal: 16, marginBottom: 20 },
  logoutText: { flex: 1, fontSize: 14, color: '#c0392b', fontWeight: '700' },
  versionText: { textAlign: 'center', color: '#a1aaa5', fontSize: 11 }
})
