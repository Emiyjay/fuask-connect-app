import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import { MORE_FEATURES } from '../config/campusFeatures'

const GREEN = '#38D39F'
const WIDTH = Dimensions.get('window').width * 0.78

export default function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const slideAnim = useRef(new Animated.Value(-WIDTH)).current
  const [role, setRole] = useState('')

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: visible ? 0 : -WIDTH, duration: 250, useNativeDriver: true }).start()
    if (visible) {
      SecureStore.getItemAsync('user').then(raw => {
        try { setRole(JSON.parse(raw || '{}')?.role || '') } catch { setRole('') }
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

  const canManage = ['hod', 'dpr', 'dean', 'super_admin'].includes(role)

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1}>
            <Text style={styles.panelTitle}>FUASK Connect</Text>
            {MORE_FEATURES.map((item) => (
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
            {canManage && (
              <TouchableOpacity
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel="Command Center"
                onPress={() => { onClose(); router.push('/admin' as any) }}
              >
                <Ionicons name="grid-outline" size={20} color={GREEN} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Command Center</Text>
              </TouchableOpacity>
            )}
            {['hod', 'dean', 'super_admin'].includes(role) && (
              <TouchableOpacity
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel="Student Directory"
                onPress={() => { onClose(); router.push('/admin/students' as any) }}
              >
                <Ionicons name="people-outline" size={20} color={GREEN} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Student Directory</Text>
              </TouchableOpacity>
            )}
            {role === 'hod' && (
              <TouchableOpacity
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel="Timetable Publisher"
                onPress={() => { onClose(); router.push('/hod/timetable' as any) }}
              >
                <Ionicons name="create-outline" size={20} color={GREEN} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Timetable Publisher</Text>
              </TouchableOpacity>
            )}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', flexDirection: 'row' },
  panel: { width: WIDTH, height: '100%', backgroundColor: '#0D1B16', borderRightWidth: 1, borderRightColor: '#1F3A2E', paddingTop: 60, paddingHorizontal: 20 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#E8F5ED', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1F3A2E' },
  rowIcon: { marginRight: 14 },
  rowLabel: { fontSize: 15, color: '#D5E7DC', fontWeight: '500' }
})
