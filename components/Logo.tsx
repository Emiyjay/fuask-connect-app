import { View, Image, StyleSheet, useWindowDimensions } from 'react-native'

export default function Logo() {
  const { width } = useWindowDimensions()
  const size = Math.min(Math.max(width * 0.22, 72), 96)

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="FUASK Connect logo"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
})
