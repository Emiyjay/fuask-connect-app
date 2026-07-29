import { View, Image, StyleSheet } from 'react-native'

export default function Logo() {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 90, resizeMode: 'contain' }
})
