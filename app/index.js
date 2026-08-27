import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useRouter } from 'expo-router';

const LOGO_DURATION_MS = 3000;
const VIDEO_DURATION_MS = 10000;
const NEXT_ROUTE = '/landing';

export default function IntroScreen() {
  const router = useRouter();
  const navigatedRef = useRef(false);
  const [phase, setPhase] = useState('logo');

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const crossfade = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(require('../assets/images/intro.mp4'), (p) => {
    p.muted = true;
    p.loop = false;
  });

  const goNext = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace(NEXT_ROUTE);
  };

  useEventListener(player, 'playToEnd', goNext);

  useEffect(() => {
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: LOGO_DURATION_MS + VIDEO_DURATION_MS,
      useNativeDriver: false,
    }).start();

    const switchTimer = setTimeout(() => {
      Animated.timing(crossfade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setPhase('video');
        player.play();
      });
    }, LOGO_DURATION_MS);

    const finalTimer = setTimeout(goNext, LOGO_DURATION_MS + VIDEO_DURATION_MS);

    return () => {
      clearTimeout(switchTimer);
      clearTimeout(finalTimer);
    };
  }, []);

  const widthInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.logoLayer, { opacity: crossfade }]}
        pointerEvents={phase === 'logo' ? 'auto' : 'none'}
      >
        <Animated.Image
          source={require('../assets/images/logo.png')}
          style={[styles.logo, { opacity: logoOpacity }]}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: crossfade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
        pointerEvents={phase === 'video' ? 'auto' : 'none'}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>

      <TouchableOpacity style={styles.skipButton} onPress={goNext}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: widthInterpolate }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  logoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 180, height: 180 },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    zIndex: 10,
  },
  skipText: { color: '#fff', fontWeight: '600' },
  progressTrack: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    zIndex: 10,
  },
  progressFill: { height: 4, backgroundColor: '#2a9d8f', borderRadius: 2 },
});
