import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'

type Role = 'hod' | 'dpr' | 'dean' | 'super_admin' | string
type User = { displayName?: string; role?: Role; department?: string }
type Business = {
  _id: string
  name: string
  category?: string
  location?: string
  submittedBy?: { displayName?: string; email?: string }
}
type Stats = {
  users: number
  activeUsers: number
  businesses: number
  pendingBusinesses: number
  timetableEntries: number
  announcements: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingBusinesses, setPendingBusinesses] = useState<Business[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const raw = await SecureStore.getItemAsync('user')
    const token = await SecureStore.getItemAsync('token')

    if (!token || !raw) {
      router.replace('/login')
      return
    }

    let parsed: User
    try {
      parsed = JSON.parse(raw)
    } catch {
      router.replace('/login')
      return
    }

    setUser(parsed)

    if (!['hod', 'dpr', 'dean', 'super_admin'].includes(parsed.role || '')) {
      Alert.alert('Restricted area', 'This command center is available to authorized staff only.')
      router.replace('/home')
      return
    }

    const headers = { Authorization: 'Bearer ' + token }

    try {
      const overview = await api.get('/admin/overview', { headers })
      setStats(overview.data.data || null)
    } catch (error: any) {
      if (error.response?.status !== 401) Alert.alert('Command Center', 'Could not load administrative statistics.')
    }

    if (['dpr', 'super_admin'].includes(parsed.role || '')) {
      try {
        const response = await api.get('/marketplace/businesses/admin/pending', { headers })
        setPendingBusinesses(response.data.data || [])
      } catch (error: any) {
        if (error.response?.status !== 403 && error.response?.status !== 401) {
          Alert.alert('Marketplace', 'Could not load pending business approvals.')
        }
      }
    }
  }, [router])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function decideBusiness(id: string, decision: 'approved' | 'rejected') {
    const token = await SecureStore.getItemAsync('token')
    if (!token) return
    try {
      await api.patch('/marketplace/businesses/' + id + '/verify', {
        decision,
        rejectionReason: decision === 'rejected' ? 'Does not meet marketplace verification requirements.' : undefined
      }, { headers: { Authorization: 'Bearer ' + token } })
      setPendingBusinesses(current => current.filter(item => item._id !== id))
      setStats(current => current ? { ...current, pendingBusinesses: Math.max(0, current.pendingBusinesses - 1) } : current)
    } catch (error: any) {
      Alert.alert('Action failed', error.response?.data?.error || 'Could not update the business.')
    }
  }

  async function publishAnnouncement() {
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle || !cleanBody) {
      Alert.alert('Missing information', 'Enter both a title and announcement message.')
      return
    }

    const token = await SecureStore.getItemAsync('token')
    if (!token) return

    setPublishing(true)
    try {
      const audience = user?.role === 'hod' ? 'department' : 'all'
      await api.post('/announcements', { title: cleanTitle, body: cleanBody, audience }, {
        headers: { Authorization: 'Bearer ' + token }
      })
      setTitle('')
      setBody('')
      setStats(current => current ? { ...current, announcements: current.announcements + 1 } : current)
      Alert.alert('Published', user?.role === 'hod' ? 'Department announcement published.' : 'Campus announcement published.')
    } catch (error: any) {
      Alert.alert('Publish failed', error.response?.data?.error || 'Could not publish announcement.')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  const role = user?.role || ''

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[GREEN]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>FUASK CONNECT</Text>
          <Text style={styles.title}>Command Center</Text>
          <Text style={styles.subtitle}>{user?.displayName || 'Authorized staff'} · {user?.department || 'Institution'}</Text>
        </View>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{role}</Text></View>
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <Stat label="Users" value={stats.users} icon="people-outline" />
          <Stat label="Active" value={stats.activeUsers} icon="pulse-outline" />
          <Stat label="Businesses" value={stats.businesses} icon="storefront-outline" />
          <Stat label="Pending" value={stats.pendingBusinesses} icon="time-outline" />
          <Stat label="Classes" value={stats.timetableEntries} icon="calendar-outline" />
          <Stat label="Announcements" value={stats.announcements} icon="megaphone-outline" />
        </View>
      )}

      <View style={styles.grid}>
        {role === 'hod' && (
          <TouchableOpacity style={styles.card} onPress={() => router.push('/hod/timetable' as any)}>
            <Ionicons name="calendar-outline" size={24} color={GREEN} />
            <Text style={styles.cardTitle}>Timetable</Text>
            <Text style={styles.cardText}>Publish classes, exams and official documents.</Text>
            <Text style={styles.action}>Open Publisher →</Text>
          </TouchableOpacity>
        )}

        {['dpr', 'super_admin'].includes(role) && (
          <View style={styles.card}>
            <Ionicons name="storefront-outline" size={24} color={GREEN} />
            <Text style={styles.cardTitle}>Marketplace</Text>
            <Text style={styles.cardText}>Verify businesses and control featured placement.</Text>
            <Text style={styles.action}>{pendingBusinesses.length} pending approval{pendingBusinesses.length === 1 ? '' : 's'}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Publish Announcement</Text>
            <Text style={styles.sectionSubtitle}>{role === 'hod' ? 'Visible to your department.' : 'Visible across FUASK Connect.'}</Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Announcement title"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <TextInput
          style={[styles.input, styles.bodyInput]}
          placeholder="Write the official message..."
          placeholderTextColor="#999"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          maxLength={3000}
        />
        <TouchableOpacity style={styles.publishButton} onPress={publishAnnouncement} disabled={publishing}>
          {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>Publish Announcement</Text>}
        </TouchableOpacity>
      </View>

      {['dpr', 'super_admin'].includes(role) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Business Verification</Text>
              <Text style={styles.sectionSubtitle}>Protect the trust layer of campus commerce.</Text>
            </View>
            <Text style={styles.count}>{pendingBusinesses.length}</Text>
          </View>

          {pendingBusinesses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={30} color={GREEN} />
              <Text style={styles.emptyTitle}>No pending businesses</Text>
              <Text style={styles.emptyText}>The verification queue is clear.</Text>
            </View>
          ) : (
            pendingBusinesses.map(item => (
              <View key={item._id} style={styles.business}>
                <View style={styles.businessIcon}>
                  <Ionicons name="storefront-outline" size={20} color={GREEN} />
                </View>
                <View style={styles.businessMain}>
                  <Text style={styles.businessName}>{item.name}</Text>
                  <Text style={styles.businessMeta}>{item.category || 'Other'} · {item.location || 'Campus'}</Text>
                  <Text style={styles.businessSubmitter}>{item.submittedBy?.displayName || 'Campus user'}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.approve} onPress={() => decideBusiness(item._id, 'approved')}>
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reject} onPress={() => decideBusiness(item._id, 'rejected')}>
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.principle}>
        <Ionicons name="shield-checkmark-outline" size={22} color={GREEN} />
        <View style={{ flex: 1 }}>
          <Text style={styles.principleTitle}>Trust before scale</Text>
          <Text style={styles.principleText}>Every staff action is constrained by role and department permissions on the backend.</Text>
        </View>
      </View>
    </ScrollView>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={GREEN} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e8ece9', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#202522', fontSize: 24, fontWeight: '800', marginTop: 3 },
  subtitle: { color: '#777', fontSize: 12, marginTop: 5, maxWidth: 250 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '31%', minWidth: 95, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e8ece9' },
  statValue: { color: '#202522', fontSize: 20, fontWeight: '800', marginTop: 5 },
  statLabel: { color: '#888', fontSize: 10, marginTop: 2 },
  grid: { gap: 12, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e8ece9' },
  cardTitle: { color: '#222', fontSize: 16, fontWeight: '800', marginTop: 10 },
  cardText: { color: '#777', fontSize: 12, lineHeight: 18, marginTop: 4 },
  action: { color: GREEN, fontSize: 12, fontWeight: '800', marginTop: 12 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e8ece9', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#222', fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: '#888', fontSize: 11, marginTop: 3 },
  input: { borderWidth: 1, borderColor: '#dfe5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#222', fontSize: 13, marginBottom: 10, backgroundColor: '#fafcfb' },
  bodyInput: { minHeight: 110 },
  publishButton: { backgroundColor: GREEN, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  publishText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  count: { backgroundColor: '#eaf5ee', color: GREEN, minWidth: 30, textAlign: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { color: '#333', fontWeight: '700', marginTop: 8 },
  emptyText: { color: '#999', fontSize: 12, marginTop: 3 },
  business: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 14, marginTop: 4 },
  businessIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  businessMain: { flex: 1 },
  businessName: { color: '#222', fontWeight: '800', fontSize: 14 },
  businessMeta: { color: '#777', fontSize: 11, marginTop: 3 },
  businessSubmitter: { color: '#aaa', fontSize: 10, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 9 },
  approve: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  approveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  reject: { borderWidth: 1, borderColor: '#e4b7b2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  rejectText: { color: '#b33a2f', fontSize: 11, fontWeight: '800' },
  principle: { backgroundColor: '#eef7f1', borderRadius: 14, padding: 15, flexDirection: 'row', gap: 10 },
  principleTitle: { color: '#245b38', fontWeight: '800', fontSize: 13 },
  principleText: { color: '#547060', fontSize: 11, lineHeight: 17, marginTop: 3 }
})
