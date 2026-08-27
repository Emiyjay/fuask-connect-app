import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Linking, Modal, TextInput, ScrollView
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#1a7a3c'

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

export default function LearnScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [materials, setMaterials] = useState<Material[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [uploadVisible, setUploadVisible] = useState(false)
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null)
  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>('general')
  const [uploading, setUploading] = useState(false)

  const cohortGroup = groups.find((g) => g.type === 'cohort') || null

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadGroupsAndUser = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const raw = await SecureStore.getItemAsync('user')
    if (raw) setUserId(JSON.parse(raw)?.id || null)
    try {
      const res = await api.get('/groups/mine', { headers: { Authorization: `Bearer ${token}` } })
      setGroups(res.data.data || [])
    } catch {
      // non-fatal — cohort tab just shows empty until this loads
    }
  }, [])

  const loadMaterials = useCallback(async (tab: Tab, groupList: GroupItem[]) => {
    const token = await getToken()
    if (!token) return
    try {
      if (tab === 'mine') {
        const res = await api.get('/materials/mine', { headers: { Authorization: `Bearer ${token}` } })
        setMaterials(res.data.data || [])
      } else if (tab === 'general') {
        const res = await api.get('/materials/general', { headers: { Authorization: `Bearer ${token}` } })
        setMaterials(res.data.data || [])
      } else {
        const cohort = groupList.find((g) => g.type === 'cohort')
        if (!cohort) {
          setMaterials([])
          return
        }
        const res = await api.get(`/materials/group/${cohort.id}`, { headers: { Authorization: `Bearer ${token}` } })
        setMaterials(res.data.data || [])
      }
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Error', 'Could not load materials.')
      }
    }
  }, [])

  useEffect(() => {
    loadGroupsAndUser().then(() => setLoading(false))
  }, [loadGroupsAndUser])

  useEffect(() => {
    loadMaterials(activeTab, groups)
  }, [activeTab, groups, loadMaterials])

  async function onRefresh() {
    setRefreshing(true)
    await loadGroupsAndUser()
    await loadMaterials(activeTab, groups)
    setRefreshing(false)
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (result.canceled) return
    const file = result.assets[0]
    setPickedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType })
  }

  async function handleUpload() {
    if (!pickedFile) {
      Alert.alert('No file selected', 'Choose a file to upload first.')
      return
    }
    if (!title.trim()) {
      Alert.alert('Title required', 'Give this material a title.')
      return
    }
    if (scopeChoice === 'cohort' && !cohortGroup) {
      Alert.alert('No cohort found', 'Could not determine your cohort group.')
      return
    }

    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('file', { uri: pickedFile.uri, name: pickedFile.name, type: pickedFile.mimeType || 'application/octet-stream' } as any)
    formData.append('title', title.trim())
    if (courseCode.trim()) formData.append('courseCode', courseCode.trim())

    if (scopeChoice === 'private') {
      formData.append('isPrivate', 'true')
    } else {
      formData.append('isPrivate', 'false')
      formData.append('scope', scopeChoice)
      if (scopeChoice === 'cohort' && cohortGroup) {
        formData.append('groupId', cohortGroup.id)
      }
    }

    setUploading(true)
    try {
      await api.post('/materials/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setUploadVisible(false)
      setPickedFile(null)
      setTitle('')
      setCourseCode('')
      const landingTab: Tab = scopeChoice === 'private' ? 'mine' : scopeChoice
      setActiveTab(landingTab)
      await loadMaterials(landingTab, groups)
    } catch (err: any) {
      Alert.alert('Upload failed', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setUploading(false)
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
            Alert.alert('Error', 'Could not delete this file.')
          }
        }
      }
    ])
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
        <Text style={styles.title}>Learn</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => setUploadVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'general' && styles.tabButtonActive]} onPress={() => setActiveTab('general')}>
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'cohort' && styles.tabButtonActive]} onPress={() => setActiveTab('cohort')}>
          <Text style={[styles.tabText, activeTab === 'cohort' && styles.tabTextActive]}>My Cohort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'mine' && styles.tabButtonActive]} onPress={() => setActiveTab('mine')}>
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>My Files</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cohort' && !cohortGroup && (
        <Text style={styles.infoBanner}>Could not find your cohort group.</Text>
      )}

      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="document-text-outline" size={24} color={GREEN} style={styles.cardIcon} />
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.courseCode ? <Text style={styles.cardSubtitle}>{item.courseCode}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)} style={styles.iconButton}>
              <Ionicons name="download-outline" size={20} color={GREEN} />
            </TouchableOpacity>
            {item.uploaderId === userId && (
              <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={20} color="#c0392b" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={uploadVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Material</Text>
              <TouchableOpacity onPress={() => setUploadVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
                <Ionicons name="attach-outline" size={20} color={GREEN} />
                <Text style={styles.filePickerText} numberOfLines={1}>
                  {pickedFile ? pickedFile.name : 'Choose a file'}
                </Text>
              </TouchableOpacity>

              <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
              <TextInput style={styles.input} placeholder="Course code (optional)" value={courseCode} onChangeText={setCourseCode} autoCapitalize="characters" />

              <Text style={styles.scopeLabel}>Who can see this?</Text>
              <View style={styles.scopeRow}>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'private' && styles.scopeChipActive]}
                  onPress={() => setScopeChoice('private')}
                >
                  <Text style={[styles.scopeChipText, scopeChoice === 'private' && styles.scopeChipTextActive]}>Only Me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'general' && styles.scopeChipActive]}
                  onPress={() => setScopeChoice('general')}
                >
                  <Text style={[styles.scopeChipText, scopeChoice === 'general' && styles.scopeChipTextActive]}>Everyone</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scopeChip, scopeChoice === 'cohort' && styles.scopeChipActive, !cohortGroup && styles.scopeChipDisabled]}
                  onPress={() => cohortGroup && setScopeChoice('cohort')}
                  disabled={!cohortGroup}
                >
                  <Text style={[styles.scopeChipText, scopeChoice === 'cohort' && styles.scopeChipTextActive]}>My Cohort</Text>
                </TouchableOpacity>
              </View>
              {scopeChoice === 'cohort' && cohortGroup && (
                <Text style={styles.scopeHint}>Only members of {cohortGroup.name} will see this.</Text>
              )}
              {scopeChoice === 'general' && (
                <Text style={styles.scopeHint}>Visible to every verified FUASK Connect user.</Text>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Upload</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#eee', borderRadius: 10, padding: 4, marginBottom: 8 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabButtonActive: { backgroundColor: GREEN },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  infoBanner: { fontSize: 12, color: '#999', textAlign: 'center', marginHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 60 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardIcon: { marginRight: 12 },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  cardSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  iconButton: { padding: 6, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  filePicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 10, padding: 14, marginBottom: 14, gap: 8 },
  filePickerText: { flex: 1, fontSize: 13, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  scopeLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  scopeChip: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  scopeChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  scopeChipDisabled: { opacity: 0.4 },
  scopeChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  scopeChipTextActive: { color: '#fff' },
  scopeHint: { fontSize: 11, color: '#999', marginBottom: 16 },
  submitButton: { backgroundColor: GREEN, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 }
})
