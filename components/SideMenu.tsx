import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a7a3c'
const WIDTH = Dimensions.get('window').width * 0.78

const ITEMS = [
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', route: '/timetable' },
  { key: 'lostfound', label: 'Lost & Found', icon: 'search-outline', route: '/lostfound' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', route: '/messages' },
  { key: 'about', label: 'About FUASK Connect', icon: 'information-circle-outline', route: '/about' },
] as const

export default function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const slideAnim = useRef(new Animated.Value(-WIDTH)).current
  const [isHOD, setIsHOD] = useState(false)

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: visible ? 0 : -WIDTH, duration: 250, useNativeDriver: true }).start()
    if (visible) {
      SecureStore.getItemAsync('user').then(raw => {
        try { setIsHOD(JSON.parse(raw || '{}')?.role === 'hod') } catch { setIsHOD(false) }
      })
    }
  }, [visible])

  async function handleLogout() {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    onClose()
    router.replace('/login')
  }

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1}>
            <Text style={styles.panelTitle}>FUASK Connect</Text>
            {ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => { onClose(); router.push(item.route as any) }}
              >
                <Ionicons name={item.icon as any} size={20} color={GREEN} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {isHOD && <TouchableOpacity
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel="Timetable Publisher"
              onPress={() => { onClose(); router.push('/hod/timetable' as any) }}
            >
              <Ionicons name="create-outline" size={20} color={GREEN} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Timetable Publisher</Text>
            </TouchableOpacity>}
            <TouchableOpacity style={styles.row} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
              <Ionicons name="log-out-outline" size={20} color="#c0392b" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: '#c0392b' }]}>Log Out</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row' },
  panel: { width: WIDTH, height: '100%', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: GREEN, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowIcon: { marginRight: 14 },
  rowLabel: { fontSize: 15, color: '#333', fontWeight: '500' }
})
