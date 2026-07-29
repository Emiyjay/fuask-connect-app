import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#1a7a3c'

type Material = {
  _id: string
  fileName?: string
  name?: string
  title?: string
  fileUrl?: string
  url?: string
  courseCode?: string
  createdAt: string
}

export default function LearnScreen() {
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadMaterials = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const response = await api.get('/materials/mine', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMaterials(response.data.data || [])
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Error', 'Could not load your materials.')
      }
    }
  }, [])

  useEffect(() => {
    loadMaterials().finally(() => setLoading(false))
  }, [loadMaterials])

  async function onRefresh() {
    setRefreshing(true)
    await loadMaterials()
    setRefreshing(false)
  }

  async function handleUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (result.canceled) return

    const file = result.assets[0]
    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream'
    } as any)

    setUploading(true)
    try {
      await api.post('/materials/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      await loadMaterials()
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
            await api.delete(`/materials/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
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
        <Text style={styles.title}>Your Materials</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No materials uploaded yet. Tap Upload to add your first file.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="document-text-outline" size={24} color={GREEN} style={styles.cardIcon} />
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.fileName || item.name || item.title || 'Untitled file'}
              </Text>
              {item.courseCode && <Text style={styles.cardSubtitle}>{item.courseCode}</Text>}
            </View>
            {(item.fileUrl || item.url) && (
              <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl || item.url || '')} style={styles.iconButton}>
                <Ionicons name="download-outline" size={20} color={GREEN} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={20} color="#c0392b" />
            </TouchableOpacity>
          </View>
        )}
      />
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
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 60 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardIcon: { marginRight: 12 },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  cardSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  iconButton: { padding: 6, marginLeft: 4 }
})
