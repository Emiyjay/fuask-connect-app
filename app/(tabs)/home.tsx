import { useState, useEffect, useCallback } from 'react'
import { ensureKeysRegistered } from '../../utils/crypto'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView, Alert
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'
import SideMenu from '../../components/SideMenu'

const GREEN = '#38D39F'

type GroupItem = { id: string; name: string; type: string; role?: string }

type Author = { _id: string; displayName: string; role: string; department: string }

type Post = {
  id: string
  content: string
  media: { url: string; type: string }[]
  isPinned: boolean
  likeCount: number
  likedByMe: boolean
  author: Author
  createdAt: string
}

type Comment = {
  _id: string
  content: string
  authorId: Author
  createdAt: string
}

export default function HomeScreen() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scope, setScope] = useState<'campus' | 'cohort'>('campus')
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [activeGroup, setActiveGroup] = useState<GroupItem | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [composeVisible, setComposeVisible] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeImages, setComposeImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  const [commentsVisible, setCommentsVisible] = useState(false)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Backend restricts posting on school/faculty/department/sug to
  // members with role 'admin' or 'oversight'. Cohort posting is open
  // to any member.
  const canPostHere = scope === 'cohort' || (scope === 'campus' && ['admin', 'oversight'].includes(activeGroup?.role || ''))

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadGroups = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await api.get('/groups/mine', { headers: { Authorization: `Bearer ${token}` } })
      setGroups(res.data.data || [])
    } catch {
      Alert.alert('Error', 'Could not load your groups.')
    }
  }, [])

  const loadPosts = useCallback(async (currentScope: 'campus' | 'cohort', groupList: GroupItem[]) => {
    const token = await getToken()
    if (!token) return
    const targetType = currentScope === 'campus' ? 'school' : 'cohort'
    const group = groupList.find((g) => g.type === targetType) || null
    setActiveGroup(group)
    if (!group) {
      setPosts([])
      return
    }
    try {
      const res = await api.get(`/posts/group/${group.id}`, { headers: { Authorization: `Bearer ${token}` } })
      setPosts(res.data.data || [])
    } catch {
      Alert.alert('Error', 'Could not load the feed.')
    }
  }, [])

  useEffect(() => {
    SecureStore.getItemAsync('token').then((token) => {
      if (token) ensureKeysRegistered(token)
    })
    loadGroups().then(() => setLoading(false))
  }, [loadGroups])

  useEffect(() => {
    if (groups.length > 0) loadPosts(scope, groups)
  }, [scope, groups, loadPosts])

  async function onRefresh() {
    setRefreshing(true)
    await loadGroups()
    await loadPosts(scope, groups)
    setRefreshing(false)
  }

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7
    })
    if (!result.canceled) {
      setComposeImages(result.assets.slice(0, 5).map((a) => a.uri))
    }
  }

  async function handlePost() {
    if (!composeText.trim()) {
      Alert.alert('Empty post', 'Write something before posting.')
      return
    }
    const token = await getToken()
    if (!token || !activeGroup) return

    const formData = new FormData()
    formData.append('groupId', activeGroup.id)
    formData.append('content', composeText)
    composeImages.forEach((uri, i) => {
      formData.append('media', { uri, name: `photo${i}.jpg`, type: 'image/jpeg' } as any)
    })

    setPosting(true)
    try {
      await api.post('/posts', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setComposeVisible(false)
      setComposeText('')
      setComposeImages([])
      await loadPosts(scope, groups)
    } catch (err: any) {
      Alert.alert('Could not post', err.response?.data?.error || 'You may not have permission to post here.')
    } finally {
      setPosting(false)
    }
  }

  async function handleLike(post: Post) {
    const token = await getToken()
    if (!token) return
    try {
      const res = await api.post(`/posts/${post.id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } })
      const { liked, likeCount } = res.data
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likedByMe: liked, likeCount } : p)))
    } catch {
      Alert.alert('Error', 'Could not update your like.')
    }
  }

  async function openComments(post: Post) {
    setActivePost(post)
    setCommentsVisible(true)
    setCommentsLoading(true)
    const token = await getToken()
    if (!token) return
    try {
      const res = await api.get(`/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
      setComments(res.data.data || [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  async function handleAddComment() {
    if (!commentText.trim() || !activePost) return
    const token = await getToken()
    if (!token) return
    try {
      await api.post(
        `/posts/${activePost.id}/comments`,
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCommentText('')
      openComments(activePost)
    } catch {
      Alert.alert('Error', 'Could not post your comment.')
    }
  }

  function messageAuthor(author: Author) {
    router.push(`/messages/${author._id}?name=${encodeURIComponent(author.displayName)}`)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Open menu">
          <Ionicons name="menu-outline" size={23} color="#E8F5ED" />
        </TouchableOpacity>
        <View style={styles.brandBlock}>
          <Text style={styles.appName}>FUASK <Text style={styles.appNameAccent}>Connect</Text></Text>
          <Text style={styles.headerTagline}>Your campus. Your community.</Text>
        </View>
        <View style={styles.brandMark}>
          <Ionicons name="school-outline" size={20} color="#07110E" />
        </View>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, scope === 'campus' && styles.toggleButtonActive]}
          onPress={() => setScope('campus')}
        >
          <Text style={[styles.toggleText, scope === 'campus' && styles.toggleTextActive]}>Campus-Wide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, scope === 'cohort' && styles.toggleButtonActive]}
          onPress={() => setScope('cohort')}
        >
          <Text style={[styles.toggleText, scope === 'cohort' && styles.toggleTextActive]}>My Cohort</Text>
        </TouchableOpacity>
      </View>

      {scope === 'campus' && !canPostHere && (
        <Text style={styles.infoBanner}>Campus-wide announcements are posted by admins only.</Text>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>WELCOME TO YOUR CAMPUS</Text>
                <Text style={styles.heroTitle}>Learn. Connect. Grow.</Text>
                <Text style={styles.heroDescription}>The people, ideas and opportunities that make FUASK yours.</Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="people" size={30} color="#07110E" />
              </View>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/learn')} accessibilityRole="button">
                <View style={[styles.quickActionIcon, styles.learnIcon]}><Ionicons name="book-outline" size={20} color="#BDF6DF" /></View>
                <Text style={styles.quickActionLabel}>Learn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/clubs')} accessibilityRole="button">
                <View style={[styles.quickActionIcon, styles.clubsIcon]}><Ionicons name="people-outline" size={20} color="#BDF6DF" /></View>
                <Text style={styles.quickActionLabel}>Clubs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/market')} accessibilityRole="button">
                <View style={[styles.quickActionIcon, styles.marketIcon]}><Ionicons name="storefront-outline" size={20} color="#BDF6DF" /></View>
                <Text style={styles.quickActionLabel}>Marketplace</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.feedHeadingRow}>
              <View>
                <Text style={styles.feedHeading}>Campus feed</Text>
                <Text style={styles.feedSubheading}>What’s happening around you</Text>
              </View>
              <View style={styles.liveDot} />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing posted here yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            {item.isPinned && (
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={12} color={GREEN} />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            )}
            <View style={styles.postHeader}>
              <Text style={styles.postAuthor}>{item.author?.displayName || 'FUASK Connect'}</Text>
              {scope === 'cohort' && (
                <TouchableOpacity onPress={() => messageAuthor(item.author)} style={styles.messageIcon}>
                  <Ionicons name="paper-plane-outline" size={16} color={GREEN} />
                </TouchableOpacity>
              )}
            </View>
            {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
            {item.media?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                {item.media.map((m, i) => (
                  <Image key={i} source={{ uri: m.url }} style={styles.mediaImage} />
                ))}
              </ScrollView>
            )}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item)}>
                <Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={18} color={item.likedByMe ? '#c0392b' : '#888'} />
                <Text style={styles.actionText}>{item.likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => openComments(item)}>
                <Ionicons name="chatbubble-outline" size={17} color="#9BB7AA" />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {canPostHere && (
        <TouchableOpacity style={styles.fab} onPress={() => setComposeVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <Modal visible={composeVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setComposeVisible(false)}>
                <Ionicons name="close" size={24} color="#B6CEC1" />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholderTextColor="#80998C"
              selectionColor={GREEN}
              style={styles.composeInput}
              placeholder={scope === 'campus' ? 'Post a campus-wide announcement' : 'Share something with your cohort'}
              value={composeText}
              onChangeText={setComposeText}
              multiline
            />
            {composeImages.length > 0 && (
              <ScrollView horizontal style={{ marginBottom: 12 }}>
                {composeImages.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.composeImagePreview} />
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.attachButton} onPress={pickImages}>
              <Ionicons name="image-outline" size={18} color={GREEN} />
              <Text style={styles.attachButtonText}>Add photos (up to 5)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handlePost} disabled={posting}>
              {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={commentsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                <Ionicons name="close" size={24} color="#B6CEC1" />
              </TouchableOpacity>
            </View>
            {commentsLoading ? (
              <ActivityIndicator color={GREEN} style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c._id}
                ListEmptyComponent={<Text style={styles.emptyText}>No comments yet.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>{item.authorId?.displayName || 'User'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                )}
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                placeholderTextColor="#80998C"
                selectionColor={GREEN}
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={handleAddComment}>
                <Ionicons name="send" size={22} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07110E' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1B16' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, gap: 12 },
  menuButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#12271D', borderWidth: 1, borderColor: '#244638', alignItems: 'center', justifyContent: 'center' },
  brandBlock: { flex: 1 },
  appName: { fontSize: 18, fontWeight: '800', color: '#E8F5ED', letterSpacing: -0.4 },
  appNameAccent: { color: GREEN },
  headerTagline: { fontSize: 11, color: '#9BB7AA', marginTop: 3 },
  brandMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  heroCard: { marginTop: 8, marginBottom: 18, padding: 18, minHeight: 150, borderRadius: 22, backgroundColor: '#0E3A2C', borderWidth: 1, borderColor: '#23634A', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, paddingRight: 8 },
  heroEyebrow: { color: '#8BE7C3', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  heroTitle: { color: '#F2FFF8', fontSize: 23, fontWeight: '800', letterSpacing: -0.7, marginBottom: 7 },
  heroDescription: { color: '#C2E5D5', fontSize: 12, lineHeight: 18, maxWidth: 240 },
  heroIconWrap: { width: 58, height: 58, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 22 },
  quickAction: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 16, backgroundColor: '#0D1B16', borderWidth: 1, borderColor: '#1F3A2E' },
  quickActionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  learnIcon: { backgroundColor: '#174E3A' },
  clubsIcon: { backgroundColor: '#174E3A' },
  marketIcon: { backgroundColor: '#174E3A' },
  quickActionLabel: { color: '#D5E7DC', fontSize: 11, fontWeight: '700' },
  feedHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feedHeading: { color: '#E8F5ED', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  feedSubheading: { color: '#80998C', fontSize: 11, marginTop: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginRight: 4 },
  toggleRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#12271D', borderRadius: 12, padding: 4, marginBottom: 8 },
  toggleButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: GREEN },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#B6CEC1' },
  toggleTextActive: { color: '#07110E' },
  infoBanner: { fontSize: 12, color: '#80998C', textAlign: 'center', marginHorizontal: 20, marginBottom: 8 },
  feedList: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { color: '#80998C', fontSize: 14, textAlign: 'center', marginTop: 40 },
  postCard: { backgroundColor: '#0D1B16', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1F3A2E' },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  pinnedText: { fontSize: 11, color: GREEN, fontWeight: '700' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  postAuthor: { fontSize: 13, fontWeight: '700', color: '#E8F5ED' },
  messageIcon: { padding: 4 },
  postContent: { fontSize: 14, color: '#D5E7DC', lineHeight: 20, marginBottom: 8 },
  mediaRow: { marginBottom: 8 },
  mediaImage: { width: 140, height: 140, borderRadius: 8, marginRight: 8 },
  postActions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: '#9BB7AA' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0D1B16', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#E8F5ED' },
  composeInput: { borderWidth: 1, borderColor: '#2A4A3A', borderRadius: 12, padding: 13, minHeight: 100, textAlignVertical: 'top', fontSize: 14, marginBottom: 12 },
  composeImagePreview: { width: 70, height: 70, borderRadius: 8, marginRight: 8 },
  attachButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  attachButtonText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  submitButton: { backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#07110E', fontWeight: '700', fontSize: 15 },
  commentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F3A2E' },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: '#E8F5ED', marginBottom: 2 },
  commentText: { fontSize: 13, color: '#D5E7DC' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F3A2E' },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#2A4A3A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14 }
})
