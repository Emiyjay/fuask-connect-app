import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#7a858c'
const BORDER = '#e6ebe8'
const BG = '#f7f9f8'

const MAX_SEARCH_LENGTH = 60

type ClubItem = {
  id: string
  _id?: string
  name: string
  type: string
  role?: string
}

function getClubId(club: ClubItem) {
  return club._id || club.id
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'C'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function formatType(type: string) {
  return type.replace(/[_-]+/g, ' ').trim() || 'Club'
}

export default function ClubsScreen() {
  const router = useRouter()
  const [myClubs, setMyClubs] = useState<ClubItem[]>([])
  const [discover, setDiscover] = useState<ClubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const getToken = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }, [router])

  const loadClubs = useCallback(async () => {
    const token = await getToken()
    if (!token) return

    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [mineRes, allRes] = await Promise.all([
        api.get('/groups/mine', { headers }),
        api.get('/groups/clubs', { headers }),
      ])

      const mineData = Array.isArray(mineRes.data?.data) ? mineRes.data.data : []
      const allData = Array.isArray(allRes.data?.data) ? allRes.data.data : []
      const mine = mineData.filter((group: ClubItem) => group.type === 'club')
      const mineIds = new Set(mine.map((group: ClubItem) => getClubId(group)))
      const all = allData.filter((group: ClubItem) => !mineIds.has(getClubId(group)))

      setMyClubs(mine)
      setDiscover(all)
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Unable to load clubs', 'Please check your connection and try again.')
      }
    }
  }, [getToken])

  useEffect(() => {
    loadClubs().finally(() => setLoading(false))
  }, [loadClubs])

  const filteredDiscover = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return discover

    return discover.filter((club) => {
      return (
        club.name.toLowerCase().includes(query) ||
        formatType(club.type).toLowerCase().includes(query)
      )
    })
  }, [discover, search])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await loadClubs()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleJoin(clubId: string) {
    if (joiningId) return

    const token = await getToken()
    if (!token) return

    setJoiningId(clubId)
    try {
      await api.post(`/groups/${clubId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await loadClubs()
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Could not join', err.response?.data?.error || 'Something went wrong. Please try again.')
      }
    } finally {
      setJoiningId(null)
    }
  }

  const renderMyClub = (club: ClubItem) => {
    const typeLabel = formatType(club.type)

    return (
      <View key={getClubId(club)} style={styles.card}>
        <View style={styles.avatar} accessible accessibilityLabel={`${club.name} club icon`}>
          <Text style={styles.avatarText}>{getInitials(club.name)}</Text>
        </View>

        <View style={styles.cardMain}>
          <Text style={styles.cardTitle} numberOfLines={2}>{club.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={MUTED} />
            <Text style={styles.cardSubtitle}>{typeLabel}</Text>
          </View>
        </View>

        {club.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color={GREEN} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>
    )
  }

  const renderDiscoverClub = (club: ClubItem) => {
    const id = getClubId(club)
    const joining = joiningId === id

    return (
      <View key={id} style={styles.card}>
        <View style={styles.avatar} accessible accessibilityLabel={`${club.name} club icon`}>
          <Text style={styles.avatarText}>{getInitials(club.name)}</Text>
        </View>

        <View style={styles.cardMain}>
          <Text style={styles.cardTitle} numberOfLines={2}>{club.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={MUTED} />
            <Text style={styles.cardSubtitle}>{formatType(club.type)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, joining && styles.joinButtonDisabled]}
          onPress={() => handleJoin(id)}
          disabled={Boolean(joiningId)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Join ${club.name}`}
          accessibilityState={{ disabled: Boolean(joiningId), busy: joining }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {joining ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.joinButtonText}>Join</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading clubs…</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>CAMPUS COMMUNITY</Text>
                <Text style={styles.title}>Clubs & Societies</Text>
                <Text style={styles.subtitle}>
                  Find communities, meet people with shared interests, and get involved on campus.
                </Text>
              </View>
              <View style={styles.headerIcon}>
                <Ionicons name="people" size={25} color={GREEN} />
              </View>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={19} color={MUTED} />
              <TextInput
                value={search}
                onChangeText={(value) => setSearch(value.slice(0, MAX_SEARCH_LENGTH))}
                placeholder="Search clubs and societies"
                placeholderTextColor="#9aa3a8"
                style={styles.searchInput}
                returnKeyType="search"
                maxLength={MAX_SEARCH_LENGTH}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search clubs and societies"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear club search"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={19} color="#9aa3a8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryNumber}>{myClubs.length}</Text>
                <Text style={styles.summaryLabel}>Joined</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={styles.summaryNumber}>{discover.length}</Text>
                <Text style={styles.summaryLabel}>Available</Text>
              </View>
              {search.trim() && (
                <View style={styles.resultsPill}>
                  <Text style={styles.resultsPillText}>{filteredDiscover.length} results</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Clubs</Text>
              {myClubs.length > 0 && <Text style={styles.sectionCount}>{myClubs.length}</Text>}
            </View>

            {myClubs.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={25} color={GREEN} />
                </View>
                <Text style={styles.emptyTitle}>Your clubs will appear here</Text>
                <Text style={styles.emptyText}>
                  Join a community below to see it in your clubs and stay connected with campus activities.
                </Text>
              </View>
            ) : (
              myClubs.map(renderMyClub)
            )}

            <View style={[styles.sectionHeader, styles.discoverHeader]}>
              <View>
                <Text style={styles.sectionTitle}>Discover</Text>
                <Text style={styles.sectionHint}>Communities you can join</Text>
              </View>
              {filteredDiscover.length > 0 && <Text style={styles.sectionCount}>{filteredDiscover.length}</Text>}
            </View>

            {filteredDiscover.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={search.trim() ? 'search-outline' : 'compass-outline'} size={25} color={GREEN} />
                </View>
                <Text style={styles.emptyTitle}>{search.trim() ? 'No clubs found' : 'No clubs to discover'}</Text>
                <Text style={styles.emptyText}>
                  {search.trim()
                    ? 'Try a different club name or category.'
                    : 'There are no additional clubs available right now. Pull down to refresh.'}
                </Text>
                {search.trim() && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearch('')}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Text style={styles.clearSearchText}>Clear search</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredDiscover.map(renderDiscoverClub)
            )}
          </>
        }
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 13, color: MUTED },
  content: { padding: 20, paddingTop: 18, paddingBottom: 90 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: GREEN, marginBottom: 5 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  subtitle: { marginTop: 7, fontSize: 13, lineHeight: 19, color: MUTED },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9f4ed',
    borderWidth: 1,
    borderColor: '#d5e9dc',
  },
  searchBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  searchInput: { flex: 1, minHeight: 48, marginLeft: 9, fontSize: 14, color: TEXT },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 22,
  },
  summaryNumber: { fontSize: 18, fontWeight: '800', color: TEXT },
  summaryLabel: { marginTop: 1, fontSize: 11, color: MUTED },
  summaryDivider: { width: 1, height: 30, backgroundColor: BORDER, marginHorizontal: 24 },
  resultsPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#edf6f0',
  },
  resultsPillText: { fontSize: 11, fontWeight: '700', color: GREEN },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  discoverHeader: { marginTop: 18, alignItems: 'flex-start' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  sectionHint: { marginTop: 2, fontSize: 11, color: MUTED },
  sectionCount: {
    marginLeft: 8,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e9f4ed',
    color: GREEN,
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf6f0',
    borderWidth: 1,
    borderColor: '#dcece1',
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: GREEN },
  cardMain: { flex: 1, minWidth: 0, paddingRight: 8 },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: TEXT },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardSubtitle: { marginLeft: 5, fontSize: 11, color: MUTED, textTransform: 'capitalize' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#edf6f0',
    borderWidth: 1,
    borderColor: '#dcece1',
  },
  adminBadgeText: { marginLeft: 4, color: GREEN, fontSize: 10, fontWeight: '800' },
  joinButton: {
    minWidth: 70,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  joinButtonDisabled: { opacity: 0.72 },
  joinButtonText: { marginLeft: 3, color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf6f0',
    marginBottom: 11,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: TEXT, textAlign: 'center' },
  emptyText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: MUTED, textAlign: 'center' },
  clearSearchButton: {
    marginTop: 14,
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf6f0',
  },
  clearSearchText: { color: GREEN, fontSize: 12, fontWeight: '800' },
})
