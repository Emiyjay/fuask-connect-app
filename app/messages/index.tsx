import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'
import { ensureKeysRegistered } from '../../utils/e2e'

const GREEN = '#1a7a3c'
type Conversation = { userId?: string; _id?: string; displayName?: string; name?: string; department?: string; unread?: number }
type User = { _id: string; displayName: string; department: string; role: string; publicKey?: string | null }

export default function ConversationsListScreen() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [searching, setSearching] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) { router.replace('/login'); return null }
    return token
  }

  const loadConversations = useCallback(async () => {
    const token = await getToken(); if (!token) return
    try {
      await ensureKeysRegistered(token)
      const res = await api.get('/messages/conversations', { headers: { Authorization: `Bearer ${token}` } })
      setConversations(res.data.data || [])
    } catch { Alert.alert('Error', 'Could not load your messages.') }
  }, [])

  useEffect(() => { loadConversations().finally(() => setLoading(false)) }, [loadConversations])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setUsers([]); return }
      const token = await getToken(); if (!token) return
      setSearching(true)
      try {
        const res = await api.get(`/message-directory/search?q=${encodeURIComponent(query.trim())}`, { headers: { Authorization: `Bearer ${token}` } })
        setUsers(res.data.data || [])
      } catch { setUsers([]) } finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  async function onRefresh() { setRefreshing(true); try { await loadConversations() } finally { setRefreshing(false) } }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={conversations}
        keyExtractor={(item, i) => item.userId || item._id || String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubbles-outline" size={42} color="#b8bec4" /><Text style={styles.emptyTitle}>Start your first conversation</Text><Text style={styles.emptyText}>Message a verified FUASK Connect user from your school community.</Text></View>}
        renderItem={({ item }) => {
          const id = item.userId || item._id || ''
          const name = item.displayName || item.name || 'User'
          return <TouchableOpacity style={styles.row} onPress={() => router.push(`/messages/${id}?name=${encodeURIComponent(name)}`)} accessibilityRole="button" accessibilityLabel={`Open conversation with ${name}`}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.rowMain}><Text style={styles.rowName}>{name}</Text>{item.department && <Text style={styles.rowPreview}>{item.department}</Text>}</View>
            {!!item.unread && <View style={styles.unread}><Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text></View>}
          </TouchableOpacity>
        }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setComposerOpen(true)} accessibilityRole="button" accessibilityLabel="New message"><Ionicons name="create-outline" size={24} color="#fff" /></TouchableOpacity>
      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Message</Text><TouchableOpacity onPress={() => { setComposerOpen(false); setQuery(''); setUsers([]) }}><Ionicons name="close" size={24} color="#555" /></TouchableOpacity></View>
          <TextInput style={styles.search} placeholder="Search name, matric number or department" value={query} onChangeText={setQuery} autoFocus />
          {searching ? <ActivityIndicator color={GREEN} style={{ marginTop: 20 }} /> : <FlatList data={users} keyExtractor={u => u._id} keyboardShouldPersistTaps="handled" ListEmptyComponent={query.length >= 2 ? <Text style={styles.searchEmpty}>No verified user found.</Text> : <Text style={styles.searchHint}>Type at least 2 characters.</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.userRow} onPress={() => { setComposerOpen(false); setQuery(''); setUsers([]); router.push(`/messages/${item._id}?name=${encodeURIComponent(item.displayName)}`) }}><View style={styles.avatarSmall}><Text style={styles.avatarText}>{item.displayName.slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.rowName}>{item.displayName}</Text><Text style={styles.rowPreview}>{item.department} · {item.role}</Text></View></TouchableOpacity>} />}
        </View></View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' }, content: { padding: 16, paddingBottom: 90 }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 }, rowMain: { flex: 1 }, rowName: { fontSize: 15, fontWeight: '700', color: '#222' }, rowPreview: { fontSize: 12, color: '#777', marginTop: 3 }, unread: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, unreadText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 30 }, emptyTitle: { fontSize: 17, fontWeight: '800', color: '#333', marginTop: 14 }, emptyText: { textAlign: 'center', color: '#858b91', lineHeight: 20, marginTop: 6 }, fab: { position: 'absolute', right: 20, bottom: 22, width: 54, height: 54, borderRadius: 27, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }, modalCard: { backgroundColor: '#fff', maxHeight: '82%', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, modalTitle: { fontSize: 20, fontWeight: '800', color: '#222' }, search: { borderWidth: 1, borderColor: '#d7dce0', backgroundColor: '#f8f9fa', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 }, userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }, searchEmpty: { textAlign: 'center', color: '#888', padding: 24 }, searchHint: { textAlign: 'center', color: '#aaa', padding: 24 }
})
