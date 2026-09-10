import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'
import { ensureKeysRegistered } from '../../utils/crypto'
import SideMenu from '../../components/SideMenu'

const GREEN = '#1a7a3c'
const POST_MAX_LENGTH = 2000
const COMMENT_MAX_LENGTH = 500

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
  const [commentPosting, setCommentPosting] = useState(false)

  const likeInFlight = useRef<Set<string>>(new Set())
  const commentRequestId = useRef(0)

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

  const loadGroups = useCallback(async (): Promise<GroupItem[] | null> => {
    const token = await getToken()
    if (!token) return null
    try {
      const res = await api.get('/groups/mine', { headers: { Authorization: `Bearer ${token}` } })
      const nextGroups = Array.isArray(res.data.data) ? res.data.data : []
      setGroups(nextGroups)
      return nextGroups
    } catch {
      Alert.alert('Error', 'Could not load your groups.')
      return null
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
      setPosts(Array.isArray(res.data.data) ? res.data.data : [])
    } catch {
      Alert.alert('Error', 'Could not load the feed.')
    }
  }, [])

  useEffect(() => {
    SecureStore.getItemAsync('token').then((token) => {
      if (token) ensureKeysRegistered(token)
    })
    loadGroups().finally(() => setLoading(false))
  }, [loadGroups])

  useEffect(() => {
    if (groups.length > 0) loadPosts(scope, groups)
    else if (!loading) {
      setActiveGroup(null)
      setPosts([])
    }
  }, [scope, groups, loadPosts, loading])

  async function onRefresh() {
    setRefreshing(true)
    try {
      const freshGroups = await loadGroups()
      if (freshGroups) await loadPosts(scope, freshGroups)
    } finally {
      setRefreshing(false)
    }
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
      quality: 0.7,
    })
    if (!result.canceled) {
      setComposeImages(result.assets.slice(0, 5).map((a) => a.uri))
    }
  }

  async function handlePost() {
    const trimmedText = composeText.trim()
    if (!trimmedText) {
      Alert.alert('Empty post', 'Write something before posting.')
      return
    }
    if (trimmedText.length > POST_MAX_LENGTH) {
      Alert.alert('Post too long', `Keep your post under ${POST_MAX_LENGTH} characters.`)
      return
    }
    if (posting) return

    const token = await getToken()
    if (!token || !activeGroup) return

    const formData = new FormData()
    formData.append('groupId', activeGroup.id)
    formData.append('content', trimmedText)
    composeImages.forEach((uri, i) => {
      formData.append('media', { uri, name: `photo${i}.jpg`, type: 'image/jpeg' } as any)
    })

    setPosting(true)
    try {
      await api.post('/posts', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
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
    if (likeInFlight.current.has(post.id)) return
    likeInFlight.current.add(post.id)

    const token = await getToken()
    if (!token) {
      likeInFlight.current.delete(post.id)
      return
    }

    try {
      const res = await api.post(`/posts/${post.id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } })
      const { liked, likeCount } = res.data
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likedByMe: Boolean(liked), likeCount: Number(likeCount) || 0 } : p)))
    } catch {
      Alert.alert('Error', 'Could not update your like.')
    } finally {
      likeInFlight.current.delete(post.id)
    }
  }

  async function openComments(post: Post) {
    const requestId = ++commentRequestId.current
    setActivePost(post)
    setComments([])
    setCommentsVisible(true)
    setCommentsLoading(true)

    const token = await getToken()
    if (!token) {
      setCommentsLoading(false)
      return
    }

    try {
      const res = await api.get(`/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
      if (requestId !== commentRequestId.current) return
      setComments(Array.isArray(res.data.data) ? res.data.data : [])
    } catch {
      if (requestId === commentRequestId.current) setComments([])
    } finally {
      if (requestId === commentRequestId.current) setCommentsLoading(false)
    }
  }

  async function handleAddComment() {
    const trimmedText = commentText.trim()
    if (!trimmedText || !activePost || commentPosting) return
    if (trimmedText.length > COMMENT_MAX_LENGTH) {
      Alert.alert('Comment too long', `Keep your comment under ${COMMENT_MAX_LENGTH} characters.`)
      return
    }

    const token = await getToken()
    if (!token) return

    setCommentPosting(true)
    try {
      await api.post(
        `/posts/${activePost.id}/comments`,
        { content: trimmedText },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setCommentText('')
      await openComments(activePost)
    } catch {
      Alert.alert('Error', 'Could not post your comment.')
    } finally {
      setCommentPosting(false)
    }
  }

  function closeComments() {
    commentRequestId.current += 1
    setCommentsVisible(false)
    setCommentsLoading(false)
    setCommentText('')
  }

  function closeComposer() {
    if (posting) return
    setComposeVisible(false)
  }

  function messageAuthor(author: Author | undefined) {
    if (!author?._id) return
    router.push(`/messages/${author._id}?name=${encodeURIComponent(author.displayName || 'Student')}`)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading your campus feed…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.iconButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Ionicons name="menu-outline" size={26} color="#222" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.appName}>FUASK Connect</Text>
          <Text style={styles.headerSubtitle}>Your verified campus community</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.toggleRow} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.toggleButton, scope === 'campus' && styles.toggleButtonActive]}
          onPress={() => setScope('campus')}
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === 'campus' }}
          accessibilityLabel="Campus-wide feed"
        >
          <Ionicons name="school-outline" size={16} color={scope === 'campus' ? '#fff' : '#666'} />
          <Text style={[styles.toggleText, scope === 'campus' && styles.toggleTextActive]}>Campus-Wide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, scope === 'cohort' && styles.toggleButtonActive]}
          onPress={() => setScope('cohort')}
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === 'cohort' }}
          accessibilityLabel="My cohort feed"
        >
          <Ionicons name="people-outline" size={16} color={scope === 'cohort' ? '#fff' : '#666'} />
          <Text style={[styles.toggleText, scope === 'cohort' && styles.toggleTextActive]}>My Cohort</Text>
        </TouchableOpacity>
      </View>

      {scope === 'campus' && !canPostHere && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#667085" />
          <Text style={styles.infoBannerText}>Campus-wide announcements are posted by admins only.</Text>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.feedList, posts.length === 0 && styles.feedListEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="newspaper-outline" size={28} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>{scope === 'campus' ? 'No campus updates yet' : 'Your cohort is quiet'}</Text>
            <Text style={styles.emptyDescription}>
              {scope === 'campus' ? 'Important announcements will appear here.' : 'Be the first to share something with your cohort.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            {item.isPinned && (
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={13} color={GREEN} />
                <Text style={styles.pinnedText}>Pinned announcement</Text>
              </View>
            )}
            <View style={styles.postHeader}>
              <View style={styles.authorWrap}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{(item.author?.displayName || 'F').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.authorTextWrap}>
                  <Text style={styles.postAuthor} numberOfLines={1}>{item.author?.displayName || 'FUASK Connect'}</Text>
                  {!!item.author?.department && <Text style={styles.postMeta} numberOfLines={1}>{item.author.department}</Text>}
                </View>
              </View>
              {scope === 'cohort' && item.author?._id && (
                <TouchableOpacity
                  onPress={() => messageAuthor(item.author)}
                  style={styles.messageIcon}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${item.author.displayName}`}
                >
                  <Ionicons name="paper-plane-outline" size={18} color={GREEN} />
                </TouchableOpacity>
              )}
            </View>
            {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
            {item.media?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow} contentContainerStyle={styles.mediaContent}>
                {item.media.map((m, i) => (
                  <Image key={`${item.id}-media-${i}`} source={{ uri: m.url }} style={styles.mediaImage} resizeMode="cover" />
                ))}
              </ScrollView>
            )}
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item)}
                disabled={likeInFlight.current.has(item.id)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={item.likedByMe ? 'Unlike post' : 'Like post'}
              >
                <Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={19} color={item.likedByMe ? '#c0392b' : '#667085'} />
                <Text style={[styles.actionText, item.likedByMe && styles.actionTextActive]}>{item.likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openComments(item)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Open comments"
              >
                <Ionicons name="chatbubble-outline" size={18} color="#667085" />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {canPostHere && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setComposeVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create a new post"
        >
          <Ionicons name="add" size={29} color="#fff" />
        </TouchableOpacity>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <Modal visible={composeVisible} animationType="slide" transparent onRequestClose={closeComposer}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Post</Text>
                <Text style={styles.modalSubtitle}>{scope === 'campus' ? 'Campus-wide announcement' : 'Share with your cohort'}</Text>
              </View>
              <TouchableOpacity onPress={closeComposer} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close new post">
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.composeInput}
              placeholder={scope === 'campus' ? 'Post a campus-wide announcement' : 'Share something with your cohort'}
              placeholderTextColor="#98A2B3"
              value={composeText}
              onChangeText={setComposeText}
              multiline
              maxLength={POST_MAX_LENGTH}
              textAlignVertical="top"
              autoFocus={false}
              accessibilityLabel="Post content"
            />
            <Text style={styles.characterCount}>{composeText.length}/{POST_MAX_LENGTH}</Text>
            {composeImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow} contentContainerStyle={styles.previewContent}>
                {composeImages.map((uri, i) => (
                  <View key={uri} style={styles.previewWrap}>
                    <Image source={{ uri }} style={styles.composeImagePreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setComposeImages((prev) => prev.filter((_, index) => index !== i))}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${i + 1}`}
                    >
                      <Ionicons name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.attachButton}
              onPress={pickImages}
              disabled={posting}
              accessibilityRole="button"
              accessibilityLabel="Add up to five photos"
            >
              <Ionicons name="image-outline" size={19} color={GREEN} />
              <Text style={styles.attachButtonText}>Add photos</Text>
              <Text style={styles.attachCount}>{composeImages.length}/5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, posting && styles.submitButtonDisabled]} onPress={handlePost} disabled={posting} accessibilityRole="button" accessibilityLabel="Publish post">
              {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publish Post</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={commentsVisible} animationType="slide" transparent onRequestClose={closeComments}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.commentsCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Comments</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{activePost?.author?.displayName || 'Post'}</Text>
              </View>
              <TouchableOpacity onPress={closeComments} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close comments">
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
            {commentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator color={GREEN} />
                <Text style={styles.commentsLoadingText}>Loading comments…</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c._id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={comments.length === 0 ? styles.commentsEmptyList : styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.commentsEmpty}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#98A2B3" />
                    <Text style={styles.commentsEmptyTitle}>No comments yet</Text>
                    <Text style={styles.commentsEmptyText}>Start the conversation.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{(item.authorId?.displayName || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>{item.authorId?.displayName || 'User'}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment…"
                placeholderTextColor="#98A2B3"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={COMMENT_MAX_LENGTH}
                multiline
                editable={!commentPosting}
                accessibilityLabel="Comment text"
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={commentPosting || !commentText.trim()}
                style={[styles.commentSendButton, (!commentText.trim() || commentPosting) && styles.commentSendButtonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Send comment"
              >
                {commentPosting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={17} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  loadingText: { marginTop: 10, color: '#667085', fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, backgroundColor: '#fff' },
  iconButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f5' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 42 },
  appName: { fontSize: 17, fontWeight: '800', color: GREEN, letterSpacing: -0.2 },
  headerSubtitle: { marginTop: 2, fontSize: 10, color: '#98A2B3' },
  toggleRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, marginBottom: 8, backgroundColor: '#e9edeb', borderRadius: 12, padding: 4 },
  toggleButton: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  toggleButtonActive: { backgroundColor: GREEN, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#667085' },
  toggleTextActive: { color: '#fff' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: '#eef2f0' },
  infoBannerText: { flex: 1, fontSize: 11, lineHeight: 16, color: '#667085' },
  feedList: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 110 },
  feedListEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#eaf3ed', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1f2933', textAlign: 'center' },
  emptyDescription: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#8a9299', textAlign: 'center' },
  postCard: { backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecea' },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f3f1' },
  pinnedText: { fontSize: 11, color: GREEN, fontWeight: '800' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  authorWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eaf3ed', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  avatarText: { color: GREEN, fontSize: 14, fontWeight: '800' },
  authorTextWrap: { flex: 1, minWidth: 0 },
  postAuthor: { fontSize: 13, fontWeight: '800', color: '#1f2933' },
  postMeta: { marginTop: 2, fontSize: 10, color: '#98A2B3' },
  messageIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef6f0', alignItems: 'center', justifyContent: 'center' },
  postContent: { fontSize: 14, color: '#344054', lineHeight: 21, marginBottom: 10 },
  mediaRow: { marginBottom: 10, marginHorizontal: -2 },
  mediaContent: { paddingHorizontal: 2 },
  mediaImage: { width: 148, height: 148, borderRadius: 10, marginRight: 8, backgroundColor: '#edf0ee' },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#f1f3f2' },
  actionButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#667085' },
  actionTextActive: { color: '#c0392b' },
  fab: { position: 'absolute', right: 22, bottom: 78, width: 56, height: 56, borderRadius: 28, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 9, paddingBottom: 20, maxHeight: '88%' },
  commentsCard: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 20 : 12, height: '82%' },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#d0d5d2', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2933' },
  modalSubtitle: { marginTop: 2, fontSize: 11, color: '#98A2B3' },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f4f6f5', alignItems: 'center', justifyContent: 'center' },
  composeInput: { borderWidth: 1, borderColor: '#d8dedb', borderRadius: 12, paddingHorizontal: 13, paddingTop: 12, minHeight: 115, maxHeight: 190, fontSize: 14, lineHeight: 20, color: '#344054', backgroundColor: '#fbfcfb' },
  characterCount: { alignSelf: 'flex-end', marginTop: 5, marginBottom: 10, fontSize: 10, color: '#98A2B3' },
  previewRow: { marginBottom: 12 },
  previewContent: { paddingRight: 4 },
  previewWrap: { position: 'relative', marginRight: 9 },
  composeImagePreview: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#edf0ee' },
  removeImageButton: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center' },
  attachButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 42, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#eef6f0', marginBottom: 12 },
  attachButtonText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  attachCount: { marginLeft: 'auto', color: '#667085', fontSize: 11, fontWeight: '600' },
  submitButton: { minHeight: 48, backgroundColor: GREEN, borderRadius: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  commentsLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  commentsLoadingText: { marginTop: 9, color: '#98A2B3', fontSize: 12 },
  commentsList: { paddingBottom: 12 },
  commentsEmptyList: { flexGrow: 1 },
  commentsEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 25 },
  commentsEmptyTitle: { marginTop: 10, fontSize: 14, fontWeight: '800', color: '#475467' },
  commentsEmptyText: { marginTop: 3, fontSize: 12, color: '#98A2B3' },
  commentRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f2f1' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eaf3ed', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  commentAvatarText: { color: GREEN, fontSize: 12, fontWeight: '800' },
  commentBody: { flex: 1, minWidth: 0 },
  commentAuthor: { fontSize: 12, fontWeight: '800', color: '#344054', marginBottom: 3 },
  commentText: { fontSize: 13, lineHeight: 18, color: '#475467' },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e9ecea', backgroundColor: '#fff' },
  commentInput: { flex: 1, minHeight: 42, maxHeight: 92, borderWidth: 1, borderColor: '#d8dedb', borderRadius: 21, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, lineHeight: 18, color: '#344054', backgroundColor: '#fbfcfb' },
  commentSendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  commentSendButtonDisabled: { backgroundColor: '#b8c1bb' },
})
