import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, RefreshControl, Modal } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'
import { ensureKeysRegistered, getOrCreateKeyPair, getTheirPublicKey, encryptForBoth, decryptMessage } from '../../utils/e2e'

const GREEN = '#1a7a3c'
type Message = { _id: string; senderId: string; receiverId: string; ciphertext: string; nonce: string; senderCiphertext?: string | null; senderNonce?: string | null; createdAt: string }
type DisplayMessage = Message & { plainText: string; decryptionFailed?: boolean }

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
  const [blocked, setBlocked] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMessage, setReportMessage] = useState<DisplayMessage | null>(null)
  const [reportReason, setReportReason] = useState('Harassment or abuse')
  const [reportContent, setReportContent] = useState('')
  const [reporting, setReporting] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) { router.replace('/login'); return null }
    return token
  }

  const loadThread = useCallback(async () => {
    const token = await getToken(); if (!token || !userId) return
    const pair = await getOrCreateKeyPair()
    await ensureKeysRegistered(token)

    try {
      const blockRes = await api.get(`/messages/${userId}/block`, { headers: { Authorization: `Bearer ${token}` } })
      setBlocked(Boolean(blockRes.data?.data?.blocked))
    } catch {
      // Block status is auxiliary; the conversation can still load.
    }
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
      return {
        ...message,
        plainText: plainText || 'Unable to decrypt this message on this device.',
        decryptionFailed: !plainText
      }
    }))
  }, [userId, myId])

  useEffect(() => {
    SecureStore.getItemAsync('user').then(raw => {
      if (raw) { const parsed = JSON.parse(raw); setMyId(parsed?.id || parsed?._id || null) }
    })
  }, [])

  useEffect(() => { if (myId) loadThread().catch(() => Alert.alert('Error', 'Could not load this conversation.')).finally(() => setLoading(false)) }, [loadThread, myId])

  async function handleBlock() {
    if (!userId || blockLoading) return
    const token = await getToken(); if (!token) return
    setActionsOpen(false)
    const action = blocked ? 'unblock' : 'block'
    Alert.alert(
      blocked ? 'Unblock user?' : 'Block user?',
      blocked ? 'You will be able to send messages to this user again.' : 'You will not be able to send messages to this user while they are blocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blocked ? 'Unblock' : 'Block',
          style: blocked ? 'default' : 'destructive',
          onPress: async () => {
            setBlockLoading(true)
            try {
              if (action === 'block') {
                await api.post(`/messages/${userId}/block`, {}, { headers: { Authorization: `Bearer ${token}` } })
                setBlocked(true)
                Alert.alert('User blocked', 'Messages from this user will remain blocked until you unblock them.')
              } else {
                await api.delete(`/messages/${userId}/block`, { headers: { Authorization: `Bearer ${token}` } })
                setBlocked(false)
                Alert.alert('User unblocked', 'You can message this user again.')
              }
            } catch (err: any) {
              Alert.alert(action === 'block' ? 'Could not block' : 'Could not unblock', err?.response?.data?.error || 'Something went wrong.')
            } finally {
              setBlockLoading(false)
            }
          }
        }
      ]
    )
  }

  function openReport(message: DisplayMessage) {
    setActionsOpen(false)
    setReportMessage(message)
    setReportContent(message.plainText)
    setReportReason('Harassment or abuse')
    setReportOpen(true)
  }

  async function submitReport() {
    if (!reportMessage || !userId || !reportContent.trim() || reporting) return
    const token = await getToken(); if (!token) return
    setReporting(true)
    try {
      await api.post(`/messages/${reportMessage._id}/report`, {
        disclosedContent: reportContent.trim(),
        reason: reportReason.trim()
      }, { headers: { Authorization: `Bearer ${token}` } })
      setReportOpen(false)
      setReportMessage(null)
      setReportContent('')
      Alert.alert('Report submitted', 'The message has been submitted for review.')
    } catch (err: any) {
      Alert.alert('Could not report', err?.response?.data?.error || 'Something went wrong.')
    } finally {
      setReporting(false)
    }
  }

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
      <Stack.Screen options={{ title: name || 'Conversation', headerRight: () => (
        <TouchableOpacity onPress={() => setActionsOpen(true)} accessibilityRole="button" accessibilityLabel="Conversation actions" accessibilityHint="Open block and report options" style={{ paddingHorizontal: 8 }}>
          <Ionicons name="ellipsis-vertical" size={21} color="#333" />
        </TouchableOpacity>
      ) }} />
      <View style={styles.securityBar} accessibilityRole="text" accessibilityLiveRegion="polite" accessibilityLabel={secureReady ? "End-to-end encrypted messaging is active" : "Secure messaging is unavailable"}><Ionicons name={secureReady ? 'lock-closed' : 'lock-open-outline'} size={14} color={secureReady ? GREEN : '#a66b00'} /><Text style={[styles.securityText, !secureReady && styles.securityWarning]}>{secureReady ? 'End-to-end encrypted' : 'Secure messaging unavailable'}</Text></View>
      <FlatList ref={listRef} data={messages} accessibilityLabel="Conversation messages" keyExtractor={m => m._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await loadThread() } finally { setRefreshing(false) } }} colors={[GREEN]} />} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<Text style={styles.emptyText}>{secureReady ? 'No messages yet. Say hello.' : 'The recipient needs to enable secure messaging before you can chat.'}</Text>} renderItem={({ item }) => { const mine = item.senderId.toString() === myId; const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]} accessible accessibilityRole="text" accessibilityLabel={(mine ? "You" : (name || "Contact")) + " said: " + item.plainText + ". " + time}><Text style={[styles.bubbleText, mine && styles.bubbleTextMine, item.decryptionFailed && styles.decryptWarning]}>{item.plainText}</Text><View style={styles.bubbleFooter}><Text style={[styles.time, mine && styles.timeMine]}>{time}</Text>{!mine && <TouchableOpacity onPress={() => openReport(item)} accessibilityRole="button" accessibilityLabel="Report this message" accessibilityHint="Report this received message to an administrator"><Ionicons name="flag-outline" size={14} color="#888" /></TouchableOpacity>}</View></View> }} />
      <View style={styles.inputRow}><TextInput style={styles.input} placeholder={secureReady ? 'Message…' : 'Secure messaging unavailable'} placeholderTextColor="#888" value={text} onChangeText={setText} multiline editable={secureReady && !sending} maxLength={2000} accessibilityLabel="Message" accessibilityHint="Type your message. It will be end-to-end encrypted before sending." returnKeyType="default" /><TouchableOpacity onPress={handleSend} disabled={!secureReady || sending || !text.trim()} style={[styles.sendButton, (!secureReady || !text.trim()) && styles.sendDisabled]} accessibilityRole="button" accessibilityLabel="Send encrypted message" accessibilityHint="Sends the typed message securely" accessibilityState={{ disabled: !secureReady || sending || !text.trim() }}>{sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}</TouchableOpacity></View>
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActionsOpen(false)}>
          <View style={styles.actionCard}>
            <Text style={styles.modalTitle}>Conversation actions</Text>
            <TouchableOpacity style={styles.actionRow} onPress={handleBlock} disabled={blockLoading} accessibilityRole="button" accessibilityLabel={blocked ? 'Unblock user' : 'Block user'}>
              <Ionicons name="ban-outline" size={20} color="#b42318" />
              <Text style={blocked ? styles.actionText : styles.dangerAction}>{blockLoading ? 'Please wait…' : (blocked ? 'Unblock user' : 'Block user')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActionsOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel">
              <Ionicons name="close-outline" size={20} color="#555" />
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => !reporting && setReportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reportCard}>
            <Text style={styles.modalTitle}>Report message</Text>
            <Text style={styles.modalHint}>Because messages are end-to-end encrypted, you choose what content to disclose for review.</Text>
            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput style={styles.inputField} value={reportReason} onChangeText={setReportReason} maxLength={120} accessibilityLabel="Report reason" />
            <Text style={styles.fieldLabel}>Message content</Text>
            <TextInput style={[styles.inputField, styles.reportContent]} value={reportContent} onChangeText={setReportContent} multiline maxLength={2000} accessibilityLabel="Reported message content" />
            <View style={styles.reportButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReportOpen(false)} disabled={reporting}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.reportButton} onPress={submitReport} disabled={reporting || !reportContent.trim() || !reportReason.trim()} accessibilityRole="button" accessibilityLabel="Submit message report">
                {reporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reportButtonText}>Submit report</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' }, decryptWarning: { fontStyle: 'italic', color: '#8a5b00' }, securityWarning: { color: '#8a5b00' }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  securityBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, backgroundColor: '#eef7f1', borderBottomWidth: 1, borderBottomColor: '#dcebe0' }, securityText: { fontSize: 11, color: GREEN, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 8 }, emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 25, lineHeight: 20 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 }, bubbleMine: { backgroundColor: GREEN, alignSelf: 'flex-end', borderBottomRightRadius: 4 }, bubbleTheirs: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' }, bubbleText: { fontSize: 14, color: '#333' }, bubbleTextMine: { color: '#fff' }, time: { fontSize: 9, color: '#8a8f94', marginTop: 4, alignSelf: 'flex-end' }, timeMine: { color: '#d8efdf' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }, actionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 }, modalTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 14 }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }, dangerAction: { color: '#b42318', fontSize: 15, fontWeight: '700' }, actionText: { color: '#444', fontSize: 15 }, reportCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 }, modalHint: { color: '#666', fontSize: 12, lineHeight: 18, marginBottom: 14 }, fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 5 }, inputField: { borderWidth: 1, borderColor: '#d7dce0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 }, reportContent: { minHeight: 90, textAlignVertical: 'top' }, reportButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }, cancelButton: { paddingHorizontal: 16, paddingVertical: 11 }, cancelText: { color: '#555', fontWeight: '700' }, reportButton: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, minWidth: 110, alignItems: 'center' }, reportButtonText: { color: '#fff', fontWeight: '800' }, bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }, inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }, input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 }, sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: '#aeb5b1' }
})
