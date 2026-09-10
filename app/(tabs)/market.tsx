import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#727b83'

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
        Alert.alert('Marketplace unavailable', 'We could not load the marketplace. Pull down to try again.')
      }
    }
  }, [])

  useEffect(() => {
    loadBusinesses().finally(() => setLoading(false))
  }, [loadBusinesses])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await loadBusinesses()
    } finally {
      setRefreshing(false)
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to add a business image.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3]
    })

    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  function closeModal() {
    if (submitting) return
    setModalVisible(false)
  }

  async function handleSubmit() {
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const trimmedCategory = category.trim()

    if (!trimmedName || !trimmedDescription) {
      Alert.alert('Missing information', 'Business name and description are required.')
      return
    }

    if (trimmedName.length < 2) {
      Alert.alert('Business name too short', 'Enter at least 2 characters.')
      return
    }

    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('businessName', trimmedName)
    formData.append('description', trimmedDescription)
    if (trimmedCategory) formData.append('category', trimmedCategory)
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
      Alert.alert('Listing submitted', 'Your business is pending admin approval.')
      setModalVisible(false)
      setName('')
      setDescription('')
      setCategory('')
      setImageUri(null)
      await loadBusinesses()
    } catch (err: any) {
      Alert.alert('Submission failed', err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading marketplace…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Discover businesses around campus</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="List a business"
          accessibilityHint="Opens the business listing form"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>List</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.list, businesses.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="storefront-outline" size={30} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>Your campus marketplace starts here</Text>
            <Text style={styles.emptyDescription}>No approved businesses are listed yet. Be among the first to submit yours.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.emptyButtonText}>List a business</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {(item.imageUrl || item.image) ? (
              <Image source={{ uri: item.imageUrl || item.image }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="storefront-outline" size={24} color="#a5ada8" />
              </View>
            )}
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.businessName || item.name || 'Campus business'}</Text>
              {item.category && <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>}
              {item.description && <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>}
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>List your business</Text>
                <Text style={styles.modalSubtitle}>It will be reviewed before appearing publicly.</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Close business form"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#56616a" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.form}
            >
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                accessibilityRole="button"
                accessibilityLabel={imageUri ? 'Change business photo' : 'Add business photo'}
                activeOpacity={0.85}
              >
                {imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <View style={styles.changePhotoBadge}>
                      <Ionicons name="camera-outline" size={14} color="#fff" />
                      <Text style={styles.changePhotoText}>Change</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.cameraIcon}>
                      <Ionicons name="camera-outline" size={23} color={GREEN} />
                    </View>
                    <Text style={styles.imagePickerText}>Add a business photo</Text>
                    <Text style={styles.imagePickerHint}>Optional</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Business name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John’s Tech Hub"
                placeholderTextColor="#9aa2a8"
                value={name}
                onChangeText={setName}
                maxLength={80}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="Food, Fashion, Services…"
                placeholderTextColor="#9aa2a8"
                value={category}
                onChangeText={setCategory}
                maxLength={40}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell students what you offer…"
                placeholderTextColor="#9aa2a8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                maxLength={500}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Submit business for approval"
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit for approval</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: MUTED, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf0ee' },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 3 },
  addButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 14, gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, paddingBottom: 36 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e8ece9', padding: 26, marginHorizontal: 4 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
  emptyDescription: { fontSize: 13, lineHeight: 20, color: MUTED, textAlign: 'center', marginTop: 7, maxWidth: 290 },
  emptyButton: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 18 },
  emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e8ece9' },
  cardImage: { width: 64, height: 64, borderRadius: 10, marginRight: 12 },
  cardImagePlaceholder: { backgroundColor: '#eef1ef', alignItems: 'center', justifyContent: 'center' },
  cardMain: { flex: 1, justifyContent: 'center', minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  cardCategory: { fontSize: 11, color: GREEN, fontWeight: '700', marginTop: 3 },
  cardDescription: { fontSize: 12, lineHeight: 17, color: MUTED, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 18, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: TEXT },
  modalSubtitle: { fontSize: 11, color: MUTED, marginTop: 3, maxWidth: 280 },
  closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f2f4f3', alignItems: 'center', justifyContent: 'center' },
  form: { paddingBottom: 24 },
  imagePicker: { height: 132, borderRadius: 14, borderWidth: 1, borderColor: '#dfe5e1', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 17, overflow: 'hidden', backgroundColor: '#fafcfb' },
  cameraIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#eaf5ee', alignItems: 'center', justifyContent: 'center' },
  imagePickerText: { color: TEXT, fontSize: 13, fontWeight: '600', marginTop: 7 },
  imagePickerHint: { color: MUTED, fontSize: 11, marginTop: 2 },
  imagePreview: { width: '100%', height: '100%' },
  changePhotoBadge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, gap: 4 },
  changePhotoText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#4b5560', marginBottom: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#d9dfdb', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14, fontSize: 14, color: TEXT },
  textArea: { minHeight: 110, paddingTop: 12 },
  submitButton: { minHeight: 50, backgroundColor: GREEN, borderRadius: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 }
})
