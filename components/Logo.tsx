import { View, Text, StyleSheet } from 'react-native'

// Placeholder logo — swap for the real FUASK crest once you have the file.
// To use a real image:
//   1. Save the logo as assets/images/logo.png
//   2. Replace the <View> below with:
//      <Image source={require('../assets/images/logo.png')} style={styles.logoImage} />

export default function Logo() {
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Text style={styles.text}>FC</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  logoImage: { width: 80, height: 80, resizeMode: 'contain' }
})
