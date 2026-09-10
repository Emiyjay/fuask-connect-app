import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import api from '../../config/api'

const GREEN = '#1a7a3c'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LEVELS = ['100L', '200L', '300L', '400L', '500L']

type ClassItem = { _id: string; level: string; courseCode: string; courseTitle: string; dayOfWeek: string; startTime: string; endTime: string; venue: string; lecturerName?: string }
type ExamItem = { _id: string; level: string; courseCode: string; courseTitle: string; examDate: string; startTime: string; endTime: string; venue: string }
type DocItem = { _id: string; level: string; fileUrl: string; updatedAt?: string }

export default function HODTimetableScreen() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [exams, setExams] = useState<ExamItem[]>([])
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [level, setLevel] = useState('100L')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [venue, setVenue] = useState('')
  const [lecturerName, setLecturerName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examStart, setExamStart] = useState('09:00')
  const [examEnd, setExamEnd] = useState('11:00')
  const [examVenue, setExamVenue] = useState('')
  const [examCode, setExamCode] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [section, setSection] = useState<'classes' | 'exams' | 'documents'>('classes')

  const tokenHeaders = async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) { router.replace('/login'); return null }
    return { Authorization: `Bearer ${token}` }
  }

  const load = useCallback(async () => {
    const headers = await tokenHeaders()
    if (!headers) return
    const res = await api.get('/timetable-admin/overview', { headers })
    setClasses(res.data.data?.classes || [])
    setExams(res.data.data?.exams || [])
    setDocuments(res.data.data?.documents || [])
  }, [])

  useEffect(() => { load().catch(() => Alert.alert('Error', 'Could not load timetable management data')).finally(() => setLoading(false)) }, [load])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try { await action(); await load() } catch (error: any) { Alert.alert('Action failed', error?.response?.data?.error || 'Please try again.') } finally { setBusy(false) }
  }

  async function addClass() {
    if (!courseCode.trim() || !courseTitle.trim() || !venue.trim()) return Alert.alert('Missing fields', 'Course code, title and venue are required.')
    await run(async () => {
      const headers = await tokenHeaders(); if (!headers) return
      await api.post('/timetable-admin/classes', { facultyCode: 'AUTO', level, courseCode: courseCode.trim(), courseTitle: courseTitle.trim(), dayOfWeek: day, startTime, endTime, venue: venue.trim(), lecturerName: lecturerName.trim() }, { headers })
      setCourseCode(''); setCourseTitle(''); setVenue(''); setLecturerName('')
    })
  }

  async function removeClass(id: string) {
    Alert.alert('Remove class?', 'This removes the published class from the department timetable.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(async () => { const headers = await tokenHeaders(); if (headers) await api.delete(`/timetable-admin/classes/${id}`, { headers }) }) }
    ])
  }

  async function addExam() {
    if (!examCode.trim() || !examTitle.trim() || !examDate.trim() || !examVenue.trim()) return Alert.alert('Missing fields', 'Complete all exam fields.')
    await run(async () => {
      const headers = await tokenHeaders(); if (!headers) return
      await api.post('/timetable-admin/exams', { facultyCode: 'AUTO', level, courseCode: examCode.trim(), courseTitle: examTitle.trim(), examDate: examDate.trim(), startTime: examStart, endTime: examEnd, venue: examVenue.trim() }, { headers })
      setExamCode(''); setExamTitle(''); setExamDate(''); setExamVenue('')
    })
  }

  async function uploadDocument() {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (picked.canceled || !picked.assets?.[0]) return
    const asset = picked.assets[0]
    await run(async () => {
      const headers = await tokenHeaders(); if (!headers) return
      const form = new FormData()
      form.append('level', level)
      form.append('file', { uri: asset.uri, name: asset.name || `timetable-${level}.pdf`, type: 'application/pdf' } as any)
      await api.post('/timetable-admin/document', form, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
    })
  }

  const visibleClasses = useMemo(() => classes.filter(item => item.level === level), [classes, level])
  const visibleExams = useMemo(() => exams.filter(item => item.level === level), [exams, level])
  const visibleDoc = documents.find(item => item.level === level)

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /></View>

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={section === 'classes' ? visibleClasses : section === 'exams' ? visibleExams : []}
      keyExtractor={(item: any) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await load() } finally { setRefreshing(false) } }} colors={[GREEN]} />}
      ListHeaderComponent={
        <View>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={GREEN} /><Text style={styles.backText}>Back</Text></TouchableOpacity>
          <Text style={styles.title}>Timetable Publisher</Text>
          <Text style={styles.subtitle}>Manage and publish your department's academic schedule.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levels}>{LEVELS.map(item => <TouchableOpacity key={item} style={[styles.levelChip, level === item && styles.levelChipActive]} onPress={() => setLevel(item)}><Text style={[styles.levelText, level === item && styles.levelTextActive]}>{item}</Text></TouchableOpacity>)}</ScrollView>
          <View style={styles.tabs}>{(['classes', 'exams', 'documents'] as const).map(item => <TouchableOpacity key={item} style={[styles.tab, section === item && styles.tabActive]} onPress={() => setSection(item)}><Text style={[styles.tabText, section === item && styles.tabTextActive]}>{item === 'classes' ? 'Classes' : item === 'exams' ? 'Exams' : 'Official PDF'}</Text></TouchableOpacity>)}</View>
          {section === 'classes' && <View style={styles.card}>
            <Text style={styles.cardTitle}>Add class · {level}</Text>
            <TextInput style={styles.input} placeholder="Course code" value={courseCode} onChangeText={setCourseCode} autoCapitalize="characters" />
            <TextInput style={styles.input} placeholder="Course title" value={courseTitle} onChangeText={setCourseTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{DAYS.map(item => <TouchableOpacity key={item} style={[styles.smallChip, day === item && styles.smallChipActive]} onPress={() => setDay(item)}><Text style={[styles.smallChipText, day === item && styles.smallChipTextActive]}>{item.slice(0, 3)}</Text></TouchableOpacity>)}</ScrollView>
            <View style={styles.row}><TextInput style={[styles.input, styles.half]} placeholder="Start 09:00" value={startTime} onChangeText={setStartTime} /><TextInput style={[styles.input, styles.half]} placeholder="End 10:00" value={endTime} onChangeText={setEndTime} /></View>
            <TextInput style={styles.input} placeholder="Venue" value={venue} onChangeText={setVenue} />
            <TextInput style={styles.input} placeholder="Lecturer (optional)" value={lecturerName} onChangeText={setLecturerName} />
            <TouchableOpacity style={styles.primary} disabled={busy} onPress={addClass}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Publish Class'}</Text></TouchableOpacity>
          </View>}
          {section === 'exams' && <View style={styles.card}>
            <Text style={styles.cardTitle}>Add exam · {level}</Text>
            <TextInput style={styles.input} placeholder="Course code" value={examCode} onChangeText={setExamCode} autoCapitalize="characters" />
            <TextInput style={styles.input} placeholder="Course title" value={examTitle} onChangeText={setExamTitle} />
            <TextInput style={styles.input} placeholder="Date YYYY-MM-DD" value={examDate} onChangeText={setExamDate} />
            <View style={styles.row}><TextInput style={[styles.input, styles.half]} placeholder="Start 09:00" value={examStart} onChangeText={setExamStart} /><TextInput style={[styles.input, styles.half]} placeholder="End 11:00" value={examEnd} onChangeText={setExamEnd} /></View>
            <TextInput style={styles.input} placeholder="Exam venue" value={examVenue} onChangeText={setExamVenue} />
            <TouchableOpacity style={styles.primary} disabled={busy} onPress={addExam}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Publish Exam'}</Text></TouchableOpacity>
          </View>}
          {section === 'documents' && <View style={styles.card}>
            <Text style={styles.cardTitle}>Official timetable PDF · {level}</Text>
            <Text style={styles.help}>{visibleDoc ? 'A document is already published for this level. Uploading another PDF replaces the active document.' : 'Upload the official PDF students should see for this level.'}</Text>
            <TouchableOpacity style={styles.upload} disabled={busy} onPress={uploadDocument}><Ionicons name="cloud-upload-outline" size={22} color={GREEN} /><Text style={styles.uploadText}>{busy ? 'Uploading…' : visibleDoc ? 'Replace Official PDF' : 'Upload Official PDF'}</Text></TouchableOpacity>
            {visibleDoc && <Text style={styles.success}>Published document available for {level}.</Text>}
          </View>}
          <Text style={styles.listTitle}>{section === 'classes' ? `Published classes · ${level}` : section === 'exams' ? `Published exams · ${level}` : 'Document status'}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{section === 'documents' ? (visibleDoc ? 'Official PDF is published above.' : 'No official PDF published for this level.') : section === 'classes' ? 'No classes published for this level.' : 'No exams published for this level.'}</Text>}
      renderItem={({ item }: any) => section === 'classes' ? <View style={styles.item}><View style={styles.itemMain}><Text style={styles.code}>{item.courseCode}</Text><Text style={styles.itemTitle}>{item.courseTitle}</Text><Text style={styles.meta}>{item.dayOfWeek} · {item.startTime}–{item.endTime} · {item.venue}</Text>{item.lecturerName ? <Text style={styles.meta}>{item.lecturerName}</Text> : null}</View><TouchableOpacity onPress={() => removeClass(item._id)} accessibilityLabel={`Remove ${item.courseCode}`}><Ionicons name="trash-outline" size={20} color="#c0392b" /></TouchableOpacity></View> : <View style={styles.item}><View style={styles.itemMain}><Text style={styles.code}>{item.courseCode}</Text><Text style={styles.itemTitle}>{item.courseTitle}</Text><Text style={styles.meta}>{new Date(item.examDate).toLocaleDateString()} · {item.startTime}–{item.endTime} · {item.venue}</Text></View><TouchableOpacity onPress={() => run(async () => { const headers = await tokenHeaders(); if (headers) await api.delete(`/timetable-admin/exams/${item._id}`, { headers }) })} accessibilityLabel={`Remove ${item.courseCode} exam`}><Ionicons name="trash-outline" size={20} color="#c0392b" /></TouchableOpacity></View>}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 18, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  backText: { color: GREEN, fontWeight: '600' },
  title: { fontSize: 25, fontWeight: '800', color: '#202124' },
  subtitle: { color: '#6b7280', marginTop: 5, marginBottom: 16, lineHeight: 20 },
  levels: { gap: 8, paddingBottom: 14 },
  levelChip: { borderWidth: 1, borderColor: '#d8dde3', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  levelChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  levelText: { color: '#555', fontWeight: '700', fontSize: 12 },
  levelTextActive: { color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#e9edf0', borderRadius: 10, padding: 3, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#687078' },
  tabTextActive: { color: GREEN },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#222', marginBottom: 12 },
  help: { color: '#666', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e5e9', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10, fontSize: 14, color: '#222' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  smallChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7, marginRight: 6, marginBottom: 10 },
  smallChipActive: { backgroundColor: '#eaf5ee', borderColor: GREEN },
  smallChipText: { fontSize: 11, color: '#666', fontWeight: '700' },
  smallChipTextActive: { color: GREEN },
  primary: { backgroundColor: GREEN, borderRadius: 9, alignItems: 'center', paddingVertical: 13, marginTop: 2 },
  primaryText: { color: '#fff', fontWeight: '800' },
  upload: { borderWidth: 1, borderColor: '#b9d8c3', borderStyle: 'dashed', borderRadius: 10, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  uploadText: { color: GREEN, fontWeight: '800' },
  success: { color: GREEN, fontSize: 12, marginTop: 10, textAlign: 'center' },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#222', marginBottom: 9 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, borderWidth: 1, borderColor: '#e8eaed', flexDirection: 'row', alignItems: 'center' },
  itemMain: { flex: 1, paddingRight: 10 },
  code: { color: GREEN, fontWeight: '800', fontSize: 12 },
  itemTitle: { color: '#222', fontWeight: '700', marginTop: 2 },
  meta: { color: '#70757a', fontSize: 12, marginTop: 5 },
  empty: { color: '#8a8f94', textAlign: 'center', paddingVertical: 25, lineHeight: 19 }
})
