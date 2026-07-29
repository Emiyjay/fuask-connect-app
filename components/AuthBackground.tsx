import { ReactNode, useEffect, useRef, useState } from 'react'
import { View, Animated, StyleSheet, Dimensions, ScrollView } from 'react-native'

const { width, height } = Dimensions.get('window')
const WATERMARK_OPACITY = 0.1

// Add more images here later to turn this into a true rotating slideshow:
// require('../assets/images/campus-1.jpg'), require('../assets/images/campus-2.jpg'), ...
const SLIDES = [require('../assets/images/logo.png')]

export default function AuthBackground({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(WATERMARK_OPACITY)).current

  useEffect(() => {
    if (SLIDES.length <= 1) return
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setIndex(prev => (prev + 1) % SLIDES.length)
        Animated.timing(opacity, { toValue: WATERMARK_OPACITY, duration: 800, useNativeDriver: true }).start()
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <View style={styles.root}>
      <Animated.Image source={SLIDES[index]} style={[styles.bgImage, { opacity }]} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  bgImage: {
    width: width * 1.4,
    height: width * 1.4,
    position: 'absolute',
    resizeMode: 'contain',
    alignSelf: 'center',
    top: height * 0.15
  },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 }
})
