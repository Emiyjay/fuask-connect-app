import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image, Modal, TextInput, ScrollView, Linking } from 'react-native'
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
  location?: string
  contactPhone?: string
  contactWhatsapp?: string | null
  imageUrl?: string
  image?: string
  status?: string
  isFeatured?: boolean
  verifiedAt?: string | null
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
  const [location, setLocation] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
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
        headers: { Authorization: 'Bearer ' + token }
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

  function resetForm() {
    setName('')
    setDescription('')
    setCategory('')
    setLocation('')
    setContactPhone('')
    setContactWhatsapp('')
    setImageUri(null)
  }

  async function handleSubmit() {
    if (!name.trim() || !description.trim() || !location.trim() || !contactPhone.trim()) {
      Alert.alert('Missing information', 'Business name, description, location, and phone number are required.')
      return
    }

    if (name.trim().length > 80 || description.trim().length > 500) {
      Alert.alert('Too long', 'Keep the business name under 80 characters and the description under 500 characters.')
      return
    }

    const token = await getToken()
    if (!token) return

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('description', description.trim())
    formData.append('category', category.trim() || 'other')
    formData.append('location', location.trim())
    formData.append('contactPhone', contactPhone.trim())
    if (contactWhatsapp.trim()) formData.append('contactWhatsapp', contactWhatsapp.trim())

    if (imageUri) {
      formData.append('image', {
        uri: imageUri,
        name: 'business.jpg',
        type: 'image/jpeg'
      } as any)
    }

    setSubmitting(true)
    try {
      await api.post('/marketplace/businesses', formData, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'multipart/form-data'
        }
      })
      Alert.alert('Submitted', 'Your business listing is pending admin approval.')
      setModalVisible(false)
      resetForm()
      await loadBusinesses()
    } catch (err: any) {
      Alert.alert('Submission failed', err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function callBusiness(phone?: string) {
    if (!phone) return
    const url = 'tel:' + phone
    const supported = await Linking.canOpenURL(url)
    if (supported) await Linking.openURL(url)
  }

  async function openWhatsApp(phone?: string) {
    if (!phone) return
    const clean = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')
    const url = 'https://wa.me/' + clean
    const supported = await Linking.canOpenURL(url)
    if (supported) await Linking.openURL(url)
    else Alert.alert('WhatsApp unavailable', 'WhatsApp is not available on this device.')
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
        <View>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Verified campus businesses</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="List a business"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>List Business</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No verified businesses listed yet. Be the first to submit one.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.isFeatured && styles.featuredCard]}>
            {(item.imageUrl || item.image) ? (
              <Image source={{ uri: item.imageUrl || item.image }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="storefront-outline" size={22} color="#bbb" />
              </View>
            )}

            <View style={styles.cardMain}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.businessName || item.name}</Text>
                {item.verifiedAt ? <Ionicons name="checkmark-circle" size={16} color={GREEN} /> : null}
              </View>

              {item.isFeatured ? (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={11} color="#8a6200" />
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              ) : null}

              {item.category && <Text style={styles.cardCategory}>{item.category}</Text>}
              {item.description && <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>}
              {item.location && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="#777" />
                  <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                </View>
              )}

              <View style={styles.actionsRow}>
                {item.contactPhone ? (
                  <TouchableOpacity style={styles.contactButton} onPress={() => callBusiness(item.contactPhone)}>
                    <Ionicons name="call-outline" size={14} color={GREEN} />
                    <Text style={styles.contactText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {item.contactWhatsapp ? (
                  <TouchableOpacity style={styles.contactButton} onPress={() => openWhatsApp(item.contactWhatsapp || undefined)}>
                    <Ionicons name="logo-whatsapp" size={14} color={GREEN} />
                    <Text style={styles.contactText}>WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>List Your Business</Text>
                <Text style={styles.modalSubtitle}>Free listing • Admin verified</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityLabel="Close business form">
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color="#999" />
                    <Text style={styles.imagePickerText}>Add business photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Business name"
                value={name}
                onChangeText={setName}
                maxLength={80}
              />
              <TextInput
                style={styles.input}
                placeholder="Category (Food, Fashion, Services...)"
                value={category}
                onChangeText={setCategory}
                maxLength={40}
              />
              <TextInput
                style={styles.input}
                placeholder="Campus location / address"
                value={location}
                onChangeText={setLocation}
                maxLength={160}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                maxLength={30}
              />
              <TextInput
                style={styles.input}
                placeholder="WhatsApp number (optional)"
                value={contactWhatsapp}
                onChangeText={setContactWhatsapp}
                keyboardType="phone-pad"
                maxLength={30}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What do you sell or provide?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
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
  subtitle: { fontSize: 11, color: '#888', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 60, paddingHorizontal: 30 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  featuredCard: { borderColor: '#d9c27a' },
  cardImage: { width: 68, height: 68, borderRadius: 8, marginRight: 12 },
  cardImagePlaceholder: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  cardMain: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  featuredBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff5cf', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  featuredText: { fontSize: 10, color: '#8a6200', fontWeight: '700' },
  cardCategory: { fontSize: 11, color: GREEN, fontWeight: '600', marginTop: 3 },
  cardDescription: { fontSize: 12, color: '#888', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { flex: 1, fontSize: 11, color: '#777' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#dfe8e2', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
  contactText: { color: GREEN, fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  modalSubtitle: { fontSize: 11, color: '#888', marginTop: 2 },
  imagePicker: { height: 120, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  imagePickerText: { color: '#999', fontSize: 13, marginTop: 6 },
  imagePreview: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  textArea: { height: 90, textAlignVertical: 'top' },
  submitButton: { backgroundColor: GREEN, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 }
})
