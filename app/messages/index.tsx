import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import api from '../../config/api'

const GREEN = '#1a7a3c'

type Conversation = {
  userId?: string
  _id?: string
  displayName?: string
  name?: string
  lastMessage?: string
}

export default function ConversationsListScreen() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadConversations = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await api.get('/messages/conversations', { headers: { Authorization: `Bearer ${token}` } })
      setConversations(res.data.data || [])
    } catch {
      Alert.alert('Error', 'Could not load your messages.')
    }
  }, [])

  useEffect(() => {
    loadConversations().finally(() => setLoading(false))
  }, [loadConversations])

  async function onRefresh() {
    setRefreshing(true)
    await loadConversations()
    setRefreshing(false)
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
      data={conversations}
      keyExtractor={(item, i) => item.userId || item._id || String(i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
      ListEmptyComponent={<Text style={styles.emptyText}>No conversations yet.</Text>}
      renderItem={({ item }) => {
        const id = item.userId || item._id || ''
        const name = item.displayName || item.name || 'User'
        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/messages/${id}?name=${encodeURIComponent(name)}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{name}</Text>
              {item.lastMessage && <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage}</Text>}
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 20 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowMain: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowPreview: { fontSize: 12, color: '#999', marginTop: 2 }
})
