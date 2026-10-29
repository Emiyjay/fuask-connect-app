import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#38D39F'

type ClubItem = {
  id: string
  _id?: string
  name: string
  type: string
  role?: string
}

export default function ClubsScreen() {
  const router = useRouter()
  const [myClubs, setMyClubs] = useState<ClubItem[]>([])
  const [discover, setDiscover] = useState<ClubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadClubs = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [mineRes, allRes] = await Promise.all([
        api.get('/groups/mine', { headers }),
        api.get('/groups/clubs', { headers })
      ])
      const mine = (mineRes.data.data || []).filter((g: ClubItem) => g.type === 'club')
      const mineIds = new Set(mine.map((g: ClubItem) => g.id))
      const all = (allRes.data.data || []).filter((g: ClubItem) => !mineIds.has(g._id || g.id))
      setMyClubs(mine)
      setDiscover(all)
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Error', 'Could not load clubs.')
      }
    }
  }, [])

  useEffect(() => {
    loadClubs().finally(() => setLoading(false))
  }, [loadClubs])

  async function onRefresh() {
    setRefreshing(true)
    await loadClubs()
    setRefreshing(false)
  }

  async function handleJoin(clubId: string) {
    const token = await getToken()
    if (!token) return
    setJoiningId(clubId)
    try {
      await api.post(`/groups/${clubId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } })
      await loadClubs()
    } catch (err: any) {
      Alert.alert('Could not join', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setJoiningId(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <>
          <View style={styles.pageIntro}>
            <Text style={styles.title}>Clubs & Societies</Text>
            <Text style={styles.pageSubtitle}>Find your people. Build something together.</Text>
            <View style={styles.clubsBanner}>
              <View style={styles.clubsBannerIcon}><Ionicons name="people" size={24} color="#07110E" /></View>
              <View style={styles.clubsBannerCopy}>
                <Text style={styles.clubsBannerTitle}>Get involved on campus</Text>
                <Text style={styles.clubsBannerText}>Explore student communities and join the ones that match your interests.</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>My Clubs</Text>
          {myClubs.length === 0 ? (
            <Text style={styles.emptyText}>You haven't joined any clubs yet.</Text>
          ) : (
            myClubs.map((club) => (
              <View key={club.id} style={styles.card}>
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle}>{club.name}</Text>
                  <Text style={styles.cardSubtitle}>{club.type}</Text>
                </View>
                {club.role === 'admin' && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Discover</Text>
          {discover.length === 0 ? (
            <Text style={styles.emptyText}>No other clubs to discover right now.</Text>
          ) : (
            discover.map((club) => {
              const id = club._id || club.id
              return (
                <View key={id} style={styles.card}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle}>{club.name}</Text>
                    <Text style={styles.cardSubtitle}>{club.type}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoin(id)}
                    disabled={joiningId === id}
                  >
                    {joiningId === id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.joinButtonText}>Join</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07110E' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1B16' },
  content: { padding: 20, paddingBottom: 60 },
  pageIntro: { marginBottom: 8 },
  title: { fontSize: 23, fontWeight: '800', color: '#E8F5ED', marginBottom: 5, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 11, color: '#9BB7AA', marginBottom: 16 },
  clubsBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: '#0E3A2C', borderWidth: 1, borderColor: '#23634A' , marginBottom: 8},
  clubsBannerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  clubsBannerCopy: { flex: 1 },
  clubsBannerTitle: { color: '#F2FFF8', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  clubsBannerText: { color: '#C2E5D5', fontSize: 11, lineHeight: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9BB7AA', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  emptyText: { color: '#80998C', fontSize: 14, fontStyle: 'italic' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D1B16', borderRadius: 16, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: '#1F3A2E' },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#E8F5ED', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#80998C', textTransform: 'capitalize' },
  adminBadge: { backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  joinButton: { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  joinButtonText: { color: '#07110E', fontSize: 12, fontWeight: '700' }
})
