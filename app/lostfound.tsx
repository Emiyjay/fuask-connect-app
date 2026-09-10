import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'

const GREEN = '#1a7a3c'

type Item = {
  _id: string
  type: 'lost' | 'found'
  title: string
  description: string
  category?: string
  location: string
  imageUrl?: string | null
  status: 'open' | 'resolved'
  reporterId?: { _id?: string; displayName?: string; department?: string } | string
  createdAt: string
}

const CATEGORIES = ['all', 'electronics', 'documents', 'clothing', 'keys', 'books', 'other']

export default function LostFoundScreen() {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [composeVisible, setComposeVisible] = useState(false)
  const [posting, setPosting] = useState(false)
  const [type, setType] = useState<'lost' | 'found'>('lost')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [itemCategory, setItemCategory] = useState('other')
  const [image, setImage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) return
    try {
      const params: Record<string, string> = {}
      if (filter !== 'all') params.type = filter
      if (category !== 'all') params.category = category
      const res = await api.get('/lostfound', { params, headers: { Authorization: `Bearer ${token}` } })
      setItems(res.data?.data || [])
    } catch {
      Alert.alert('Could not load Lost & Found', 'Please check your connection and try again.')
    }
  }, [filter, category])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => `${item.title} ${item.description} ${item.location} ${item.category || ''}`.toLowerCase().includes(query))
  }, [items, search])

  async function refresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an item photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 })
    if (!result.canceled) setImage(result.assets[0]?.uri || null)
  }

  async function submit() {
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert('Missing details', 'Title, description, and location are required.')
      return
    }
    const token = await SecureStore.getItemAsync('token')
    if (!token) return
    const formData = new FormData()
    formData.append('type', type)
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('category', itemCategory)
    formData.append('location', location.trim())
    if (image) formData.append('image', { uri: image, name: 'item.jpg', type: 'image/jpeg' } as any)

    setPosting(true)
    try {
      await api.post('/lostfound', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
      setComposeVisible(false)
      setTitle(''); setDescription(''); setLocation(''); setItemCategory('other'); setImage(null)
      await load()
    } catch (err: any) {
      Alert.alert('Could not post item', err.response?.data?.error || 'Something went wrong.')
    } finally { setPosting(false) }
  }

  async function resolve(item: Item) {
    const token = await SecureStore.getItemAsync('token')
    if (!token) return
    try {
      await api.patch(`/lostfound/${item._id}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } })
      await load()
    } catch (err: any) { Alert.alert('Could not update item', err.response?.data?.error || 'Something went wrong.') }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Lost & Found' }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[GREEN]} />}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="search-outline" size={24} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Lost & Found</Text>
            <Text style={styles.subtitle}>Help campus members recover their belongings.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setComposeVisible(true)} accessibilityLabel="Report a lost or found item">
            <Ionicons name="add" size={23} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#888" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search items, places or descriptions" style={styles.searchInput} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'lost', 'found'] as const).map((value) => (
            <TouchableOpacity key={value} style={[styles.filterButton, filter === value && styles.filterActive]} onPress={() => setFilter(value)}>
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((value) => (
            <TouchableOpacity key={value} style={[styles.categoryButton, category === value && styles.categoryActive]} onPress={() => setCategory(value)}>
              <Text style={[styles.categoryText, category === value && styles.categoryTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {visibleItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={30} color="#aaa" />
            <Text style={styles.emptyTitle}>Nothing found</Text>
            <Text style={styles.emptyText}>Try another search or be the first to report an item.</Text>
          </View>
        ) : visibleItems.map((item) => (
          <View style={styles.card} key={item._id}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} /> : null}
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, item.type === 'found' && styles.foundBadge]}>
                  <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <View style={styles.meta}><Ionicons name="location-outline" size={15} color="#777" /><Text style={styles.metaText}>{item.location}</Text></View>
              {!!item.category && <View style={styles.meta}><Ionicons name="pricetag-outline" size={14} color="#777" /><Text style={styles.metaText}>{item.category}</Text></View>}
              {!!item.reporterId && <Text style={styles.reporter}>Reported by {typeof item.reporterId === 'object' ? item.reporterId.displayName || 'FUASK member' : 'FUASK member'}</Text>}
              <TouchableOpacity style={styles.resolveButton} onPress={() => resolve(item)}>
                <Ionicons name="checkmark-circle-outline" size={16} color={GREEN} />
                <Text style={styles.resolveText}>Mark as resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {composeVisible && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Report an item</Text><TouchableOpacity onPress={() => setComposeVisible(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity></View>
            <View style={styles.typeRow}>
              {(['lost', 'found'] as const).map((value) => <TouchableOpacity key={value} style={[styles.typeButton, type === value && styles.typeButtonActive]} onPress={() => setType(value)}><Text style={[styles.typeButtonText, type === value && styles.typeButtonTextActive]}>{value === 'lost' ? 'I lost something' : 'I found something'}</Text></TouchableOpacity>)}
            </View>
            <TextInput style={styles.input} placeholder="Item title" value={title} onChangeText={setTitle} maxLength={100} />
            <TextInput style={[styles.input, styles.multiline]} placeholder="Describe the item" value={description} onChangeText={setDescription} multiline maxLength={1000} />
            <TextInput style={styles.input} placeholder="Where was it lost/found?" value={location} onChangeText={setLocation} maxLength={150} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 8 }}>
              {CATEGORIES.slice(1).map((value) => <TouchableOpacity key={value} style={[styles.categoryButton, itemCategory === value && styles.categoryActive]} onPress={() => setItemCategory(value)}><Text style={[styles.categoryText, itemCategory === value && styles.categoryTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text></TouchableOpacity>)}
            </ScrollView>
            {image ? <Image source={{ uri: image }} style={styles.preview} /> : null}
            <TouchableOpacity style={styles.attachButton} onPress={pickImage}><Ionicons name="image-outline" size={18} color={GREEN} /><Text style={styles.attachText}>{image ? 'Change photo' : 'Add photo'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={posting}>{posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publish report</Text>}</TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 14 },
  heroIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  title: { fontSize: 20, fontWeight: '800', color: '#222' }, subtitle: { fontSize: 12, color: '#777', marginTop: 3 },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 13 },
  filterRow: { gap: 8, paddingBottom: 8 }, filterButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' }, filterActive: { backgroundColor: GREEN, borderColor: GREEN }, filterText: { fontSize: 12, fontWeight: '700', color: '#666' }, filterTextActive: { color: '#fff' },
  categoryRow: { gap: 7, paddingBottom: 8 }, categoryButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: '#f0f1f2' }, categoryActive: { backgroundColor: '#dcebe1' }, categoryText: { fontSize: 11, color: '#666', fontWeight: '600' }, categoryTextActive: { color: GREEN },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 30, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#e8e8e8' }, emptyTitle: { fontSize: 15, fontWeight: '700', color: '#444', marginTop: 8 }, emptyText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginTop: 10, borderWidth: 1, borderColor: '#e8e8e8' }, itemImage: { width: '100%', height: 170 }, cardBody: { padding: 14 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, typeBadge: { backgroundColor: '#fdecea', borderRadius: 15, paddingHorizontal: 9, paddingVertical: 4 }, foundBadge: { backgroundColor: '#eaf5ee' }, typeText: { fontSize: 9, fontWeight: '800', color: '#555' }, date: { fontSize: 10, color: '#999' }, itemTitle: { fontSize: 16, fontWeight: '800', color: '#222', marginTop: 9 }, description: { fontSize: 13, color: '#555', lineHeight: 19, marginTop: 5 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }, metaText: { fontSize: 12, color: '#777', flex: 1 }, reporter: { fontSize: 11, color: '#999', marginTop: 9 }, resolveButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 12 }, resolveText: { fontSize: 12, fontWeight: '700', color: GREEN },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }, modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, modalTitle: { fontSize: 18, fontWeight: '800', color: '#222' }, typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 }, typeButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 11, alignItems: 'center' }, typeButtonActive: { backgroundColor: GREEN, borderColor: GREEN }, typeButtonText: { fontSize: 12, fontWeight: '700', color: '#666' }, typeButtonTextActive: { color: '#fff' }, input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, marginBottom: 9 }, multiline: { minHeight: 80, textAlignVertical: 'top' }, preview: { width: '100%', height: 130, borderRadius: 10, marginBottom: 8 }, attachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderWidth: 1, borderColor: '#dcebe1', borderRadius: 10, marginBottom: 9 }, attachText: { fontSize: 12, fontWeight: '700', color: GREEN }, submitButton: { backgroundColor: GREEN, borderRadius: 11, paddingVertical: 13, alignItems: 'center' }, submitText: { color: '#fff', fontWeight: '800', fontSize: 13 }
})
