import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image, Modal, TextInput, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#1a7a3c'

type Business = {
  _id: string
  businessName?: string
  name?: string
  description?: string
  category?: string
  imageUrl?: string
  image?: string
}

export default function MarketScreen() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)

  const getToken = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) {
      router.replace('/login')
      return null
    }
    return token
  }

  const loadBusinesses = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const response = await api.get('/marketplace/businesses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBusinesses(response.data.data || [])
    } catch (err: any) {
      if (err.response?.status !== 401) {
        Alert.alert('Error', 'Could not load the marketplace.')
      }
    }
  }, [])

  useEffect(() => {
    loadBusinesses().finally(() => setLoading(false))
  }, [loadBusinesses])

  async function onRefresh() {
    setRefreshing(true)
    await loadBusinesses()
    setRefreshing(false)
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a business image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  async function handleSubmit() {
    if (!name || !description) {
      Alert.alert('Missing info', 'Please fill in the business name and description.')
      return
    }
    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('businessName', name)
    formData.append('description', description)
    if (category) formData.append('category', category)
    if (imageUri) {
      formData.append('image', { uri: imageUri, name: 'business.jpg', type: 'image/jpeg' } as any)
    }

    setSubmitting(true)
    try {
      await api.post('/marketplace/businesses', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      Alert.alert('Submitted', 'Your business listing is pending admin approval.')
      setModalVisible(false)
      setName('')
      setDescription('')
      setCategory('')
      setImageUri(null)
      await loadBusinesses()
    } catch (err: any) {
      Alert.alert('Submission failed', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSubmitting(false)
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>List Business</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No businesses listed yet. Be the first to add one.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {(item.imageUrl || item.image) ? (
              <Image source={{ uri: item.imageUrl || item.image }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="storefront-outline" size={22} color="#bbb" />
              </View>
            )}
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.businessName || item.name}</Text>
              {item.category && <Text style={styles.cardCategory}>{item.category}</Text>}
              {item.description && <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>}
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List Your Business</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color="#999" />
                    <Text style={styles.imagePickerText}>Add photo</Text>
                  </>
                )}
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="Business name" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Category (e.g. Food, Fashion, Services)" value={category} onChangeText={setCategory} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit for Approval</Text>}
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
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 60 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardImage: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  cardImagePlaceholder: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  cardMain: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  cardCategory: { fontSize: 11, color: GREEN, fontWeight: '600', marginTop: 2 },
  cardDescription: { fontSize: 12, color: '#888', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  imagePicker: { height: 120, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  imagePickerText: { color: '#999', fontSize: 13, marginTop: 6 },
  imagePreview: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  textArea: { height: 90, textAlignVertical: 'top' },
  submitButton: { backgroundColor: GREEN, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 }
})
