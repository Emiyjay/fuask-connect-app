import { ScrollView, Text, StyleSheet } from 'react-native'

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

      <Text style={styles.heading}>Eligibility</Text>
      <Text style={styles.body}>
        FUASK Connect is available to current students and staff of Federal University of
        Applied Sciences, Kachia. Registration requires a valid matric number tied to your
        department and cohort.
      </Text>

      <Text style={styles.heading}>Acceptable Use</Text>
      <Text style={styles.body}>
        You agree not to post content that is harassing, fraudulent, or violates university
        policy. Marketplace listings and lost & found posts must be accurate and made in
        good faith. Impersonating another student or staff member is not permitted.
      </Text>

      <Text style={styles.heading}>Account Responsibility</Text>
      <Text style={styles.body}>
        You are responsible for keeping your password secure. Notify us immediately if you
        believe your account has been compromised.
      </Text>

      <Text style={styles.heading}>Content Ownership</Text>
      <Text style={styles.body}>
        You retain ownership of content you post. By posting, you grant FUASK Connect
        permission to display that content to other verified users within the app.
      </Text>

      <Text style={styles.heading}>Changes to Service</Text>
      <Text style={styles.body}>
        FUASK Connect is under active development. Features may change, and this document
        will be updated as the app evolves.
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
