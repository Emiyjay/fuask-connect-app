import { ReactNode, useEffect, useRef, useState } from 'react'
import { View, Animated, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const WATERMARK_OPACITY = 0.1

// Add more images here later to turn this into a true rotating slideshow:
// require('../assets/images/campus-1.jpg'), require('../assets/images/campus-2.jpg'), ...
const SLIDES = [require('../assets/images/logo.png')]

export default function AuthBackground({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(WATERMARK_OPACITY)).current
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (SLIDES.length <= 1) return
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setIndex(prev => (prev + 1) % SLIDES.length)
        Animated.timing(opacity, { toValue: WATERMARK_OPACITY, duration: 800, useNativeDriver: true }).start()
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [opacity])

  const watermarkSize = Math.min(Math.max(width * 1.15, 280), 520)
  const contentPaddingHorizontal = Math.min(Math.max(width * 0.06, 20), 32)

  return (
    <View style={styles.root}>
      <Animated.Image
        source={SLIDES[index]}
        style={[
          styles.bgImage,
          {
            width: watermarkSize,
            height: watermarkSize,
            top: Math.max(insets.top + height * 0.12, 72),
          },
          { opacity },
        ]}
        accessible={false}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 20, 32),
            paddingBottom: Math.max(insets.bottom + 24, 32),
            paddingHorizontal: contentPaddingHorizontal,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  bgImage: {
    position: 'absolute',
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
})
