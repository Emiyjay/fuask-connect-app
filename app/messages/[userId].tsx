import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'
import { ensureKeysRegistered, getOrCreateKeyPair, getTheirPublicKey, encryptForBoth, decryptMessage } from '../../utils/e2e'

const GREEN = '#1a7a3c'
type Message = { _id: string; senderId: string; receiverId: string; ciphertext: string; nonce: string; senderCiphertext?: string | null; senderNonce?: string | null; createdAt: string }
type DisplayMessage = Message & { plainText: string }

export default function ConversationScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>()
  const router = useRouter()
  const listRef = useRef<FlatList>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [secureReady, setSecureReady] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) { router.replace('/login'); return null }
    return token
  }

  const loadThread = useCallback(async () => {
    const token = await getToken(); if (!token || !userId) return
    const pair = await getOrCreateKeyPair()
    await ensureKeysRegistered(token)
    const theirPublicKey = await getTheirPublicKey(userId, token)
    if (!theirPublicKey) { setSecureReady(false); return }
    setSecureReady(true)
    const res = await api.get(`/messages/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
    const raw: Message[] = res.data.data || []
    setMessages(raw.map(message => {
      const mine = message.senderId.toString() === myId
      const cipher = mine ? message.senderCiphertext : message.ciphertext
      const nonce = mine ? message.senderNonce : message.nonce
      const plainText = cipher && nonce ? (mine ? decryptMessage(cipher, nonce, pair.publicKey, pair.secretKey) : decryptMessage(cipher, nonce, theirPublicKey, pair.secretKey)) : null
      return { ...message, plainText: plainText || 'Secure message' }
    }))
  }, [userId, myId])

  useEffect(() => {
    SecureStore.getItemAsync('user').then(raw => {
      if (raw) { const parsed = JSON.parse(raw); setMyId(parsed?.id || parsed?._id || null) }
    })
  }, [])

  useEffect(() => { if (myId) loadThread().catch(() => Alert.alert('Error', 'Could not load this conversation.')).finally(() => setLoading(false)) }, [loadThread, myId])

  async function handleSend() {
    const value = text.trim(); if (!value || !userId || sending) return
    const token = await getToken(); if (!token) return
    setSending(true)
    try {
      const pair = await getOrCreateKeyPair()
      await ensureKeysRegistered(token)
      const theirPublicKey = await getTheirPublicKey(userId, token)
      if (!theirPublicKey) throw new Error('This user has not enabled secure messaging yet.')
      const encrypted = encryptForBoth(value, theirPublicKey, pair.publicKey, pair.secretKey)
      await api.post('/messages', { receiverId: userId, ...encrypted }, { headers: { Authorization: `Bearer ${token}` } })
      setText('')
      await loadThread()
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (err: any) { Alert.alert('Could not send', err?.response?.data?.error || err?.message || 'Something went wrong.') } finally { setSending(false) }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <Stack.Screen options={{ title: name || 'Conversation' }} />
      <View style={styles.securityBar}><Ionicons name={secureReady ? 'lock-closed' : 'lock-open-outline'} size={14} color={secureReady ? GREEN : '#a66b00'} /><Text style={styles.securityText}>{secureReady ? 'End-to-end encrypted' : 'Secure messaging unavailable'}</Text></View>
      <FlatList ref={listRef} data={messages} keyExtractor={m => m._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await loadThread() } finally { setRefreshing(false) } }} colors={[GREEN]} />} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<Text style={styles.emptyText}>{secureReady ? 'No messages yet. Say hello.' : 'The recipient needs to enable secure messaging before you can chat.'}</Text>} renderItem={({ item }) => { const mine = item.senderId.toString() === myId; return <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}><Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.plainText}</Text><Text style={[styles.time, mine && styles.timeMine]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View> }} />
      <View style={styles.inputRow}><TextInput style={styles.input} placeholder={secureReady ? 'Message…' : 'Secure messaging unavailable'} value={text} onChangeText={setText} multiline editable={secureReady && !sending} /><TouchableOpacity onPress={handleSend} disabled={!secureReady || sending || !text.trim()} style={[styles.sendButton, (!secureReady || !text.trim()) && styles.sendDisabled]} accessibilityLabel="Send encrypted message">{sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}</TouchableOpacity></View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  securityBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, backgroundColor: '#eef7f1', borderBottomWidth: 1, borderBottomColor: '#dcebe0' }, securityText: { fontSize: 11, color: GREEN, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 8 }, emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 25, lineHeight: 20 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 }, bubbleMine: { backgroundColor: GREEN, alignSelf: 'flex-end', borderBottomRightRadius: 4 }, bubbleTheirs: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' }, bubbleText: { fontSize: 14, color: '#333' }, bubbleTextMine: { color: '#fff' }, time: { fontSize: 9, color: '#8a8f94', marginTop: 4, alignSelf: 'flex-end' }, timeMine: { color: '#d8efdf' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }, input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 }, sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: '#aeb5b1' }
})
