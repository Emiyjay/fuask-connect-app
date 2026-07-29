import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const HIERARCHY_ORDER = ['school', 'faculty', 'department', 'cohort']

type GroupItem = {
  id: string
  name: string
  type: string
  courseCode: string | null
  parentGroupId: string | null
  role: string
  joinedAt: string
}

type UserData = {
  displayName: string
  role: string
  department: string
  level: string
}

export default function DashboardScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [user, setUser] = useState<UserData | null>(null)

  const loadUser = useCallback(async () => {
    const raw = await SecureStore.getItemAsync('user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  const loadGroups = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return
    }
    try {
      const response = await api.get('/groups/mine', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroups(response.data.data || [])
      setError('')
    } catch (err: any) {
      if (err.response?.status === 401) {
        await SecureStore.deleteItemAsync('token')
        router.replace('/login')
        return
      }
      setError(err.response?.data?.error || 'Could not load your groups. Check your connection.')
    }
  }, [router])

  useEffect(() => {
    loadUser()
    loadGroups().finally(() => setLoading(false))
  }, [loadUser, loadGroups])

  async function onRefresh() {
    setRefreshing(true)
    await loadGroups()
    setRefreshing(false)
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    router.replace('/login')
  }

  const academicChain = HIERARCHY_ORDER
    .map((type) => groups.find((g) => g.type === type))
    .filter((g): g is GroupItem => Boolean(g))

  const otherGroups = groups.filter((g) => !HIERARCHY_ORDER.includes(g.type))

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>FUASK Connect</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>
        Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {academicChain.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Academic Path</Text>
              <View style={styles.breadcrumbCard}>
                {academicChain.map((g, i) => (
                  <View key={g.id} style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbText}>{g.name}</Text>
                    {i < academicChain.length - 1 && (
                      <Ionicons name="chevron-down" size={16} color="#bbb" style={styles.breadcrumbArrow} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Groups & Clubs</Text>
            {otherGroups.length === 0 ? (
              <Text style={styles.emptyText}>You haven't joined any clubs or groups yet.</Text>
            ) : (
              otherGroups.map((g) => (
                <View key={g.id} style={styles.groupCard}>
                  <View style={styles.groupCardMain}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupType}>{g.type}</Text>
                  </View>
                  {g.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  appName: { fontSize: 16, fontWeight: '700', color: GREEN },
  logoutButton: { padding: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 24 },
  errorBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 16, marginBottom: 20 },
  errorText: { color: '#c0392b', fontSize: 14, marginBottom: 8 },
  retryText: { color: GREEN, fontWeight: '600', fontSize: 14 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  breadcrumbCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  breadcrumbRow: { alignItems: 'center' },
  breadcrumbText: { fontSize: 15, fontWeight: '600', color: '#222', textAlign: 'center' },
  breadcrumbArrow: { marginVertical: 4 },
  emptyText: { color: '#999', fontSize: 14, fontStyle: 'italic' },
  groupCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  groupCardMain: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  groupType: { fontSize: 12, color: '#999', textTransform: 'capitalize' },
  adminBadge: { backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' }
})
