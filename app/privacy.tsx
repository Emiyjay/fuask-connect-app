import { ScrollView, Text, StyleSheet } from 'react-native'

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

      <Text style={styles.heading}>What We Collect</Text>
      <Text style={styles.body}>
        To create your account, we collect your full name, matric number, email address,
        department, and cohort. Once you're using FUASK Connect, we also store the content
        you create — posts, messages, marketplace listings, lost & found reports, and any
        materials you upload.
      </Text>

      <Text style={styles.heading}>How We Use It</Text>
      <Text style={styles.body}>
        Your matric number and department place you in the correct group hierarchy (school,
        faculty, department, cohort) so you see relevant timetables, materials, and
        announcements. Your email is used for account verification and password resets. We
        may send push notifications for messages, group activity, and important updates.
      </Text>

      <Text style={styles.heading}>Data Storage & Security</Text>
      <Text style={styles.body}>
        Account data is stored in a secured MongoDB database. Passwords are encrypted and
        never stored in plain text. Uploaded images and files are stored via Cloudinary.
        We do not sell your personal information to third parties.
      </Text>

      <Text style={styles.heading}>Your Rights</Text>
      <Text style={styles.body}>
        You can request a copy of your data or request account deletion at any time by
        contacting the app administrator through the school's designated channel.
      </Text>

      <Text style={styles.heading}>Contact</Text>
      <Text style={styles.body}>
        Questions about this policy can be directed to the FUASK Connect development team
        through the Department of Cybersecurity.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  updated: { fontSize: 12, color: '#999', marginBottom: 24 },
  heading: { fontSize: 16, fontWeight: '700', color: '#1a7a3c', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: '#444', lineHeight: 21 }
})
