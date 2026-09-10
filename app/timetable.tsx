import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import api from '../config/api'

const GREEN = '#1a7a3c'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type ClassEntry = {
  _id: string
  courseCode: string
  courseTitle: string
  dayOfWeek: string
  startTime: string
  endTime: string
  venue: string
  lecturerName?: string
}

type ExamEntry = {
  id: string
  courseCode: string
  courseTitle: string
  examDate: string
  startTime: string
  endTime: string
  venue: string
  urgency: 'past' | 'red' | 'yellow' | 'green'
}

type TimetableDocument = { fileUrl?: string }

async function getToken() {
  return SecureStore.getItemAsync('token')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TimetableScreen() {
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [exams, setExams] = useState<ExamEntry[]>([])
  const [document, setDocument] = useState<TimetableDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState('Monday')

  const load = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [classRes, examRes, documentRes] = await Promise.allSettled([
        api.get('/timetable/mine', { headers }),
        api.get('/timetable/exams/mine', { headers }),
        api.get('/timetable/document/mine', { headers })
      ])

      if (classRes.status === 'fulfilled') setClasses(classRes.value.data?.data || [])
      else setClasses([])
      if (examRes.status === 'fulfilled') setExams(examRes.value.data?.data || [])
      else setExams([])
      if (documentRes.status === 'fulfilled') setDocument(documentRes.value.data?.data || null)
      else setDocument(null)
    } catch {
      Alert.alert('Could not load timetable', 'Please check your connection and try again.')
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function refresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  const dayClasses = useMemo(
    () => classes.filter((entry) => entry.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()),
    [classes, selectedDay]
  )

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Timetable' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[GREEN]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="calendar-outline" size={24} color="#fff" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>My Timetable</Text>
            <Text style={styles.subtitle}>Your department and level schedule</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedDay === day }}
              style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{selectedDay}</Text>
        {dayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={28} color="#aaa" />
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptyText}>There are no timetable entries for {selectedDay}.</Text>
          </View>
        ) : dayClasses.map((entry) => (
          <View style={styles.classCard} key={entry._id}>
            <View style={styles.timeColumn}>
              <Text style={styles.time}>{entry.startTime}</Text>
              <Text style={styles.timeDivider}>—</Text>
              <Text style={styles.time}>{entry.endTime}</Text>
            </View>
            <View style={styles.classMain}>
              <Text style={styles.courseCode}>{entry.courseCode}</Text>
              <Text style={styles.courseTitle}>{entry.courseTitle}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color="#777" />
                <Text style={styles.metaText}>{entry.venue}</Text>
              </View>
              {!!entry.lecturerName && (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={15} color="#777" />
                  <Text style={styles.metaText}>{entry.lecturerName}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Upcoming Exams</Text>
        {exams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={28} color="#aaa" />
            <Text style={styles.emptyTitle}>No exams scheduled</Text>
            <Text style={styles.emptyText}>Your department has not published an exam schedule for your level yet.</Text>
          </View>
        ) : exams.map((exam) => (
          <View style={styles.examCard} key={String(exam.id)}>
            <View style={styles.examTop}>
              <Text style={styles.courseCode}>{exam.courseCode}</Text>
              <View style={[styles.urgency, exam.urgency === 'red' && styles.urgencyRed, exam.urgency === 'yellow' && styles.urgencyYellow]}>
                <Text style={styles.urgencyText}>{exam.urgency === 'past' ? 'Past' : exam.urgency === 'red' ? 'Soon' : exam.urgency === 'yellow' ? 'This week' : 'Upcoming'}</Text>
              </View>
            </View>
            <Text style={styles.courseTitle}>{exam.courseTitle}</Text>
            <View style={styles.metaRow}><Ionicons name="calendar-outline" size={15} color="#777" /><Text style={styles.metaText}>{formatDate(exam.examDate)}</Text></View>
            <View style={styles.metaRow}><Ionicons name="time-outline" size={15} color="#777" /><Text style={styles.metaText}>{exam.startTime} — {exam.endTime}</Text></View>
            <View style={styles.metaRow}><Ionicons name="location-outline" size={15} color="#777" /><Text style={styles.metaText}>{exam.venue}</Text></View>
          </View>
        ))}

        {document?.fileUrl && (
          <TouchableOpacity style={styles.documentButton} onPress={() => Linking.openURL(document.fileUrl!)} accessibilityRole="button">
            <Ionicons name="document-attach-outline" size={20} color={GREEN} />
            <View style={{ flex: 1 }}>
              <Text style={styles.documentTitle}>Official timetable document</Text>
              <Text style={styles.documentText}>Open the latest document uploaded by your department.</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={GREEN} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 16 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroCopy: { flex: 1 },
  title: { fontSize: 21, fontWeight: '800', color: '#202020' },
  subtitle: { fontSize: 13, color: '#777', marginTop: 3 },
  dayRow: { gap: 8, paddingBottom: 8 },
  dayButton: { minWidth: 58, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center' },
  dayButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  dayText: { fontSize: 13, fontWeight: '700', color: '#666' },
  dayTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#222', marginTop: 18, marginBottom: 10 },
  classCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8' },
  timeColumn: { width: 70, borderRightWidth: 1, borderRightColor: '#eee', marginRight: 14, justifyContent: 'center' },
  time: { fontSize: 12, fontWeight: '700', color: GREEN },
  timeDivider: { color: '#bbb', fontSize: 10, marginVertical: 2 },
  classMain: { flex: 1 },
  courseCode: { fontSize: 14, fontWeight: '800', color: GREEN },
  courseTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 3, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  metaText: { flex: 1, fontSize: 12, color: '#777' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#444', marginTop: 8 },
  emptyText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 5, lineHeight: 18 },
  examCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8' },
  examTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgency: { backgroundColor: '#eaf5ee', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  urgencyRed: { backgroundColor: '#fdecea' },
  urgencyYellow: { backgroundColor: '#fff5d9' },
  urgencyText: { fontSize: 10, fontWeight: '800', color: '#555' },
  documentButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#dcebe1' },
  documentTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  documentText: { fontSize: 11, color: '#888', marginTop: 3 }
})
