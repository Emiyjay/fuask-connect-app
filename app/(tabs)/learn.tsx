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
  Linking,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const TEXT = '#222'
const MUTED = '#667085'
const MAX_TITLE_LENGTH = 120
const MAX_COURSE_CODE_LENGTH = 20

 type Material = {
  _id: string
  title: string
  courseCode?: string | null
  fileUrl: string
  fileType?: string | null
  isPrivate: boolean
  scope?: 'general' | 'cohort'
  uploaderId: string
  createdAt: string
}

type GroupItem = { id: string; name: string; type: string }
type Tab = 'mine' | 'general' | 'cohort'
type ScopeChoice = 'private' | 'general' | 'cohort'

function getFileIcon(fileType?: string | null): keyof typeof Ionicons.glyphMap {
  const type = (fileType || '').toLowerCase()
  if (type.includes('pdf')) return 'document-text-outline'
  if (type.includes('word') || type.includes('document')) return 'document-outline'
  if (type.includes('sheet') || type.includes('excel') || type.includes('spreadsheet')) return 'grid-outline'
  if (type.includes('presentation') || type.includes('powerpoint')) return 'easel-outline'
  if (type.includes('image')) return 'image-outline'
  if (type.includes('zip') || type.includes('rar')) return 'archive-outline'
  return 'document-attach-outline'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LearnScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [materials, setMaterials] = useState<Material[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [uploadVisible, setUploadVisible] = useState(false)
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null)
  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>('general')
  const [uploading, setUploading] = useState(false)

  const cohortGroup = groups.find((g) => g.type === 'cohort') || null

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      if (!token) {
        router.replace('/login')
        return null
      }
      return token
    } catch {
      router.replace('/login')
      return null
    }
  }

  const loadGroupsAndUser = useCallback(async (): Promise<GroupItem[]> => {
    const token = await getToken()
    if (!token) return []

    try {
      const raw = await SecureStore.getItemAsync('user')
      if (raw) {
        const parsed = JSON.parse(raw)
        setUserId(parsed?.id || parsed?._id || null)
      } else {
        setUserId(null)
      }
    } catch {
      setUserId(null)
    }

    try {
      const res = await api.get('/groups/mine', { headers: { Authorization: `Bearer ${token}` } })
      const loadedGroups: GroupItem[] = Array.isArray(res.data.data) ? res.data.data : []
      setGroups(loadedGroups)
      return loadedGroups
    } catch {
      return []
    }
  }, [])

  const loadMaterials = useCallback(async (tab: Tab, groupList: GroupItem[]) => {
    const token = await getToken()
    if (!token) return

    try {
      let res
      if (tab === 'mine') {
        res = await api.get('/materials/mine', { headers: { Authorization: `Bearer ${token}` } })
      } else if (tab === 'general') {
        res = await api.get('/materials/general', { headers: { Authorization: `Bearer ${token}` } })
      } else {
        const cohort = groupList.find((g) => g.type === 'cohort')
        if (!cohort) {
          setMaterials([])
          return
        }
        res = await api.get(`/materials/group/${cohort.id}`, { headers: { Authorization: `Bearer ${token}` } })
      }

      setMaterials(Array.isArray(res.data.data) ? res.data.data : [])
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Unable to load materials', 'Please check your connection and try again.')
      }
    }
  }, [])

  useEffect(() => {
    loadGroupsAndUser().finally(() => setLoading(false))
  }, [loadGroupsAndUser])

  useEffect(() => {
    loadMaterials(activeTab, groups)
  }, [activeTab, groups, loadMaterials])

  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return materials
    return materials.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      (item.courseCode || '').toLowerCase().includes(query)
    )
  }, [materials, searchQuery])

  async function onRefresh() {
    setRefreshing(true)
    try {
      const loadedGroups = await loadGroupsAndUser()
      await loadMaterials(activeTab, loadedGroups)
    } finally {
      setRefreshing(false)
    }
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (result.canceled) return
      const file = result.assets[0]
      if (!file) return
      setPickedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType })
    } catch {
      Alert.alert('File picker error', 'Could not choose this file.')
    }
  }

  function resetUploadForm() {
    setPickedFile(null)
    setTitle('')
    setCourseCode('')
    setScopeChoice('general')
  }

  function closeUpload() {
    if (uploading) return
    setUploadVisible(false)
    resetUploadForm()
  }

  async function handleUpload() {
    const trimmedTitle = title.trim()
    const trimmedCourseCode = courseCode.trim().toUpperCase()

    if (uploading) return
    if (!pickedFile) {
      Alert.alert('No file selected', 'Choose a file to upload first.')
      return
    }
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Give this material a clear title.')
      return
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      Alert.alert('Title too long', `Keep the title under ${MAX_TITLE_LENGTH} characters.`)
      return
    }
    if (trimmedCourseCode.length > MAX_COURSE_CODE_LENGTH) {
      Alert.alert('Course code too long', `Keep the course code under ${MAX_COURSE_CODE_LENGTH} characters.`)
      return
    }
    if (scopeChoice === 'cohort' && !cohortGroup) {
      Alert.alert('No cohort found', 'Could not determine your cohort group.')
      return
    }

    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('file', {
      uri: pickedFile.uri,
      name: pickedFile.name,
      type: pickedFile.mimeType || 'application/octet-stream'
    } as any)
    formData.append('title', trimmedTitle)
    if (trimmedCourseCode) formData.append('courseCode', trimmedCourseCode)

    if (scopeChoice === 'private') {
      formData.append('isPrivate', 'true')
    } else {
      formData.append('isPrivate', 'false')
      formData.append('scope', scopeChoice)
      if (scopeChoice === 'cohort' && cohortGroup) formData.append('groupId', cohortGroup.id)
    }

    setUploading(true)
    try {
      await api.post('/materials/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      const landingTab: Tab = scopeChoice === 'private' ? 'mine' : scopeChoice
      setActiveTab(landingTab)
      setUploadVisible(false)
      resetUploadForm()
      await loadMaterials(landingTab, groups)
      Alert.alert('Uploaded', 'Your learning material is now available in the selected space.')
    } catch (err: any) {
      Alert.alert('Upload failed', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setUploading(false)
    }
  }

  async function openMaterial(material: Material) {
    if (!material.fileUrl) {
      Alert.alert('File unavailable', 'This material does not have a valid file link.')
      return
    }
    try {
      const supported = await Linking.canOpenURL(material.fileUrl)
      if (!supported) {
        Alert.alert('Cannot open file', 'Your device cannot open this material link.')
        return
      }
      await Linking.openURL(material.fileUrl)
    } catch {
      Alert.alert('Cannot open file', 'Could not open this material.')
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete material', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const token = await getToken()
          if (!token) return
          try {
            await api.delete(`/materials/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setMaterials((prev) => prev.filter((m) => m._id !== id))
          } catch {
            Alert.alert('Delete failed', 'Could not delete this material.')
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Preparing your learning space…</Text>
      </View>
    )
  }

  const emptyTitle = searchQuery.trim()
    ? 'No matching materials'
    : activeTab === 'general'
      ? 'No shared materials yet'
      : activeTab === 'cohort'
        ? 'Your cohort is quiet'
        : 'You have no saved materials'

  const emptyDescription = searchQuery.trim()
    ? 'Try a different title or course code.'
    : activeTab === 'general'
      ? 'Shared notes, guides and resources will appear here.'
      : activeTab === 'cohort'
        ? 'Cohort resources will appear here when someone shares them.'
        : 'Upload a private study file and it will appear here.'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>Study resources for verified students</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setUploadVisible(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Upload learning material"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'general' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('general'); setSearchQuery('') }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'general' }}
        >
          <Ionicons name="globe-outline" size={15} color={activeTab === 'general' ? '#fff' : MUTED} />
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cohort' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('cohort'); setSearchQuery('') }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'cohort' }}
        >
          <Ionicons name="people-outline" size={15} color={activeTab === 'cohort' ? '#fff' : MUTED} />
          <Text style={[styles.tabText, activeTab === 'cohort' && styles.tabTextActive]}>Cohort</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mine' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('mine'); setSearchQuery('') }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'mine' }}
        >
          <Ionicons name="folder-outline" size={15} color={activeTab === 'mine' ? '#fff' : MUTED} />
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>My Files</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#98A2B3" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search title or course code"
          placeholderTextColor="#98A2B3"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          accessibilityLabel="Search learning materials"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color="#98A2B3" />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'cohort' && !cohortGroup && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={MUTED} />
          <Text style={styles.infoBannerText}>Your cohort group could not be found yet.</Text>
        </View>
      )}

      <FlatList
        data={filteredMaterials}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.list, filteredMaterials.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={10}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name={searchQuery.trim() ? 'search-outline' : 'book-outline'} size={28} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyDescription}>{emptyDescription}</Text>
            {!searchQuery.trim() && (
              <TouchableOpacity style={styles.emptyAction} onPress={() => setUploadVisible(true)}>
                <Ionicons name="cloud-upload-outline" size={16} color={GREEN} />
                <Text style={styles.emptyActionText}>Upload material</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.fileIconWrap}>
              <Ionicons name={getFileIcon(item.fileType)} size={24} color={GREEN} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.metaRow}>
                {!!item.courseCode && <Text style={styles.courseBadge}>{item.courseCode}</Text>}
                {!!item.createdAt && <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => openMaterial(item)}
              style={styles.iconButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <Ionicons name="open-outline" size={20} color={GREEN} />
            </TouchableOpacity>
            {item.uploaderId === userId && (
              <TouchableOpacity
                onPress={() => handleDelete(item._id)}
                style={styles.iconButton}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
              >
                <Ionicons name="trash-outline" size={20} color="#c0392b" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={uploadVisible} animationType="slide" transparent onRequestClose={closeUpload}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload Material</Text>
                <Text style={styles.modalSubtitle}>Share knowledge with the right people.</Text>
              </View>
              <TouchableOpacity
                onPress={closeUpload}
                disabled={uploading}
                style={styles.closeButton}
                hitSlop={8}
                accessibilityLabel="Close upload form"
              >
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.filePicker} onPress={pickFile} accessibilityRole="button" accessibilityLabel="Choose a file">
                <View style={styles.filePickerIcon}>
                  <Ionicons name="attach-outline" size={20} color={GREEN} />
                </View>
                <View style={styles.filePickerMain}>
                  <Text style={styles.filePickerTitle}>{pickedFile ? 'Selected file' : 'Choose a file'}</Text>
                  <Text style={styles.filePickerText} numberOfLines={1}>
                    {pickedFile ? pickedFile.name : 'PDF, document, image or other supported file'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MTH102 Integration Notes"
                placeholderTextColor="#98A2B3"
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TITLE_LENGTH}
                autoCapitalize="sentences"
              />
              <Text style={styles.characterHint}>{title.length}/{MAX_TITLE_LENGTH}</Text>

              <Text style={styles.fieldLabel}>Course code <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MTH102"
                placeholderTextColor="#98A2B3"
                value={courseCode}
                onChangeText={setCourseCode}
                maxLength={MAX_COURSE_CODE_LENGTH}
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>Who can see this?</Text>
              <View style={styles.scopeRow}>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'private' && styles.scopeChipActive]}
                  onPress={() => setScopeChoice('private')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scopeChoice === 'private' }}
                >
                  <Ionicons name="lock-closed-outline" size={15} color={scopeChoice === 'private' ? '#fff' : MUTED} />
                  <Text style={[styles.scopeChipText, scopeChoice === 'private' && styles.scopeChipTextActive]}>Only Me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'general' && styles.scopeChipActive]}
                  onPress={() => setScopeChoice('general')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scopeChoice === 'general' }}
                >
                  <Ionicons name="globe-outline" size={15} color={scopeChoice === 'general' ? '#fff' : MUTED} />
                  <Text style={[styles.scopeChipText, scopeChoice === 'general' && styles.scopeChipTextActive]}>Everyone</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'cohort' && styles.scopeChipActive, !cohortGroup && styles.scopeChipDisabled]}
                  onPress={() => cohortGroup && setScopeChoice('cohort')}
                  disabled={!cohortGroup}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scopeChoice === 'cohort', disabled: !cohortGroup }}
                >
                  <Ionicons name="people-outline" size={15} color={scopeChoice === 'cohort' ? '#fff' : MUTED} />
                  <Text style={[styles.scopeChipText, scopeChoice === 'cohort' && styles.scopeChipTextActive]}>Cohort</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scopeHintBox}>
                <Ionicons
                  name={scopeChoice === 'private' ? 'lock-closed-outline' : scopeChoice === 'cohort' ? 'people-outline' : 'globe-outline'}
                  size={15}
                  color={GREEN}
                />
                <Text style={styles.scopeHint}>
                  {scopeChoice === 'private'
                    ? 'Only you will be able to access this material.'
                    : scopeChoice === 'cohort' && cohortGroup
                      ? `Only members of ${cohortGroup.name} will see this.`
                      : 'Visible to every verified FUASK Connect user.'}
                </Text>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleUpload} disabled={uploading} accessibilityRole="button" accessibilityLabel="Upload material">
                {uploading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={styles.submitButtonText}>Upload Material</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24 },
  loadingText: { marginTop: 10, fontSize: 13, color: MUTED },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, gap: 5, elevation: 2 },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#e9edf0', borderRadius: 12, padding: 4, marginBottom: 10 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 9 },
  tabButtonActive: { backgroundColor: GREEN },
  tabText: { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e4e7ec' },
  searchInput: { flex: 1, fontSize: 13, color: TEXT, marginLeft: 8, paddingVertical: 0 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginBottom: 10, padding: 10, backgroundColor: '#eef2f0', borderRadius: 10 },
  infoBannerText: { flex: 1, fontSize: 12, color: MUTED },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 70 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eaf4ee', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEXT, textAlign: 'center' },
  emptyDescription: { fontSize: 13, lineHeight: 19, color: MUTED, textAlign: 'center', marginTop: 5 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#b9d9c4', borderRadius: 20 },
  emptyActionText: { fontSize: 12, fontWeight: '700', color: GREEN },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eaecf0' },
  fileIconWrap: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#edf7f0', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: TEXT },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  courseBadge: { fontSize: 10, fontWeight: '800', color: GREEN, backgroundColor: '#edf7f0', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  cardDate: { fontSize: 10, color: '#98A2B3' },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: TEXT },
  modalSubtitle: { fontSize: 12, color: MUTED, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f2f4f7', alignItems: 'center', justifyContent: 'center' },
  filePicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d0d5dd', borderStyle: 'dashed', borderRadius: 13, padding: 12, marginBottom: 17 },
  filePickerIcon: { width: 42, height: 42, borderRadius: 11, backgroundColor: '#edf7f0', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  filePickerMain: { flex: 1, minWidth: 0 },
  filePickerTitle: { fontSize: 12, fontWeight: '800', color: TEXT, marginBottom: 3 },
  filePickerText: { fontSize: 12, color: MUTED },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#344054', marginBottom: 7 },
  optional: { color: '#98A2B3', fontWeight: '500' },
  input: { height: 46, borderWidth: 1, borderColor: '#d0d5dd', borderRadius: 10, paddingHorizontal: 13, fontSize: 14, color: TEXT, marginBottom: 4 },
  characterHint: { fontSize: 10, color: '#98A2B3', textAlign: 'right', marginBottom: 12 },
  scopeRow: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  scopeChip: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#d0d5dd', borderRadius: 12, paddingHorizontal: 5 },
  scopeChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  scopeChipDisabled: { opacity: 0.4 },
  scopeChipText: { fontSize: 11, fontWeight: '700', color: MUTED },
  scopeChipTextActive: { color: '#fff' },
  scopeHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#f5f8f6', borderRadius: 10, padding: 10, marginBottom: 14 },
  scopeHint: { flex: 1, fontSize: 11, lineHeight: 16, color: MUTED },
  submitButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: GREEN, borderRadius: 11, paddingHorizontal: 14, marginTop: 2, marginBottom: 18 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
})
