import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'

type Role = 'hod' | 'dean' | 'super_admin' | string

type Student = {
  id: string
  displayName: string
  matricNumber?: string
  department?: string
  faculty?: string
  level?: number | string | null
  accountStatus?: 'active' | 'withdrawn' | 'expelled' | 'suspended'
  isVerified?: boolean
}

const STATUS_FILTERS = ['all', 'active', 'suspended', 'withdrawn', 'expelled'] as const

export default function StudentDirectory() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('')
  const [students, setStudents] = useState<Student[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (showLoader = true) => {
    const token = await SecureStore.getItemAsync('token')
    const raw = await SecureStore.getItemAsync('user')

    if (!token || !raw) {
      router.replace('/login')
      return
    }

    let parsed: { role?: Role }
    try {
      parsed = JSON.parse(raw)
    } catch {
      router.replace('/login')
      return
    }

    setRole(parsed.role || '')
    if (!['hod', 'dean', 'super_admin'].includes(parsed.role || '')) {
      router.replace('/home')
      return
    }

    if (showLoader) setLoading(true)

    try {
      const params: Record<string, string> = {}
      const cleanQuery = query.trim()
      if (cleanQuery.length >= 2) params.q = cleanQuery
      if (status !== 'all') params.status = status

      const response = await api.get('/student-directory', {
        params,
        headers: { Authorization: 'Bearer ' + token }
      })
      setStudents(response.data.data || [])
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert('Student Directory', error.response?.data?.error || 'Could not load students.')
      }
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [router, query, status])

  useEffect(() => {
    const timer = setTimeout(() => { load() }, query.trim().length >= 2 ? 350 : 0)
    return () => clearTimeout(timer)
  }, [load])

  async function refresh() {
    setRefreshing(true)
    await load(false)
    setRefreshing(false)
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={23} color="#222" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.kicker}>INSTITUTIONAL IDENTITY</Text>
          <Text style={styles.title}>Student Directory</Text>
          <Text style={styles.subtitle}>
            {role === 'hod' ? 'Your department' : role === 'dean' ? 'Your faculty' : 'Institution-wide'}
          </Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>{students.length}</Text></View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#777" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, matric number or department"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={80}
          accessibilityLabel="Search students"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={19} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.filter, status === item && styles.filterActive]}
            onPress={() => setStatus(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: status === item }}
          >
            <Text style={[styles.filterText, status === item && styles.filterTextActive]}>
              {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={students}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[GREEN]} />}
        contentContainerStyle={students.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <StudentCard student={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#aaa" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>
              {query.trim().length >= 2 ? 'Try another name, matric number or department.' : 'There are no students matching the selected filter.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

function StudentCard({ student }: { student: Student }) {
  const verified = student.isVerified
  const status = student.accountStatus || 'active'

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(student.displayName || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardMain}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{student.displayName}</Text>
          {verified && <Ionicons name="checkmark-circle" size={17} color={GREEN} />}
        </View>
        <Text style={styles.matric}>{student.matricNumber || 'No matric number'}</Text>
        <Text style={styles.meta}>{student.department || 'Department'} · {student.level ? String(student.level) + 'L' : 'Level unavailable'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, status !== 'active' && styles.statusPillMuted]}>
            <Text style={[styles.statusText, status !== 'active' && styles.statusTextMuted]}>{status}</Text>
          </View>
          <Text style={styles.verificationText}>{verified ? 'Verified identity' : 'Verification pending'}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e8ece9' },
  kicker: { color: GREEN, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#202522', fontSize: 21, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#888', fontSize: 11, marginTop: 3 },
  countBadge: { backgroundColor: '#eaf5ee', borderRadius: 16, minWidth: 34, paddingHorizontal: 9, paddingVertical: 7, alignItems: 'center' },
  countText: { color: GREEN, fontSize: 12, fontWeight: '800' },
  searchBox: { margin: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe5e1', borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, color: '#222', fontSize: 13, paddingVertical: 11, marginLeft: 8 },
  filters: { flexDirection: 'row', paddingHorizontal: 14, gap: 7, marginBottom: 10 },
  filter: { borderWidth: 1, borderColor: '#dfe5e1', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 },
  filterActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { color: '#666', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  list: { padding: 14, paddingTop: 4, paddingBottom: 30 },
  emptyList: { flexGrow: 1, padding: 30, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e8ece9', padding: 14, marginBottom: 10, flexDirection: 'row' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { color: GREEN, fontSize: 16, fontWeight: '800' },
  cardMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#222', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  matric: { color: '#555', fontSize: 11, marginTop: 3, fontWeight: '600' },
  meta: { color: '#888', fontSize: 11, marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  statusPill: { backgroundColor: '#eaf5ee', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillMuted: { backgroundColor: '#f1f1f1' },
  statusText: { color: GREEN, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  statusTextMuted: { color: '#777' },
  verificationText: { color: '#888', fontSize: 9 },
  empty: { alignItems: 'center' },
  emptyTitle: { color: '#333', fontSize: 15, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#999', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 }
})
