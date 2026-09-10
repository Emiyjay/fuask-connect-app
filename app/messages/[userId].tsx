import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'
import { getOrCreateKeyPair, ensureKeysRegistered, getTheirPublicKey, encryptMessage, decryptMessage } from '../../utils/crypto'

const GREEN = '#1a7a3c'

type Message = {
  _id: string
  senderId: string
  receiverId: string
  ciphertext: string
  nonce: string
  createdAt: string
  decryptedContent?: string
}

export default function ConversationScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>()
  const router = useRouter()
  const listRef = useRef<FlatList>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [mySecretKey, setMySecretKey] = useState<string | null>(null)
  const [theirPublicKey, setTheirPublicKey] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadThread = useCallback(async () => {
    const token = await getToken()
    if (!token || !userId) return

    try {
      const rawUser = await SecureStore.getItemAsync('user')
      const storedUser = rawUser ? JSON.parse(rawUser) : null
      const currentId = storedUser?.id || storedUser?._id || null
      const { secretKey } = await getOrCreateKeyPair()

      setMyId(currentId)
      setMySecretKey(secretKey)
      await ensureKeysRegistered(token)

      const recipientKey = await getTheirPublicKey(userId, token)
      setTheirPublicKey(recipientKey)

      const res = await api.get(`/messages/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      const rawMessages = res.data.data || []
      const decryptedMessages = rawMessages.map((message: Message) => ({
        ...message,
        decryptedContent: recipientKey
          ? decryptMessage(message.ciphertext, message.nonce, recipientKey, secretKey) || undefined
          : undefined
      }))
      setMessages(decryptedMessages)
    } catch {
      Alert.alert('Error', 'Could not load this conversation.')
    }
  }, [userId])

  useEffect(() => {
    loadThread().finally(() => setLoading(false))
  }, [loadThread])

  async function handleSend() {
    const trimmedText = text.trim()
    if (!trimmedText || !userId) return

    const token = await getToken()
    if (!token) return

    setSending(true)
    try {
      const keyPair = await getOrCreateKeyPair()
      const recipientKey = theirPublicKey || await getTheirPublicKey(userId, token)

      if (!recipientKey) {
        Alert.alert(
          'Secure messaging unavailable',
          'This account has not registered a secure messaging key yet. Ask them to open Messages once and try again.'
        )
        return
      }

      const { ciphertext, nonce } = encryptMessage(trimmedText, recipientKey, keyPair.secretKey)
      await api.post(
        '/messages',
        { receiverId: userId, ciphertext, nonce },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setText('')
      await loadThread()
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (err: any) {
      Alert.alert('Could not send', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSending(false)
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Stack.Screen options={{ title: name || 'Conversation' }} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m._id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Say hello.</Text>}
        renderItem={({ item }) => {
          const isMine = item.senderId === myId
          const content = item.decryptedContent || 'Unable to decrypt this secure message.'
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{content}</Text>
            </View>
          )
        }}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="Message..." value={text} onChangeText={setText} multiline />
        <TouchableOpacity onPress={handleSend} disabled={sending} style={styles.sendButton}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 8 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 40 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  bubbleMine: { backgroundColor: GREEN, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
  bubbleText: { fontSize: 14, color: '#333' },
  bubbleTextMine: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }
})
