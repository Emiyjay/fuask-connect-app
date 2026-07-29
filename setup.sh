#!/usr/bin/env bash
set -e

echo "Setting up fuask-connect-app frontend additions..."

mkdir -p components app assets

# --- components/PasswordStrengthMeter.js ---
cat > components/PasswordStrengthMeter.js << 'EOF'
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function scorePassword(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

const LEVELS = [
  { label: 'Very Weak', color: '#e63946' },
  { label: 'Weak', color: '#f4a261' },
  { label: 'Fair', color: '#e9c46a' },
  { label: 'Good', color: '#8ab17d' },
  { label: 'Strong', color: '#2a9d8f' },
];

export default function PasswordStrengthMeter({ password }) {
  const score = useMemo(() => scorePassword(password), [password]);
  const level = score === 0 ? null : LEVELS[score - 1];

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i <= score ? level.color : '#e0e0e0' },
            ]}
          />
        ))}
      </View>
      {password?.length > 0 && (
        <Text style={[styles.label, { color: level.color }]}>{level.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6, marginBottom: 12 },
  barRow: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  label: { marginTop: 4, fontSize: 12, fontWeight: '600' },
});
EOF

# --- app/register.js ---
cat > app/register.js << 'EOF'
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const REGISTER_ENDPOINT = 'https://your-api.example.com/auth/register/student'; // swap in your real endpoint

export default function RegisterScreen() {
  const router = useRouter();
  const [matricNumber, setMatricNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!matricNumber || !email || !password) {
      Alert.alert('Missing fields', 'Fill in all fields before submitting.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricNumber, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Registration failed', data.message || 'Please try again.');
        return;
      }

      Alert.alert('Success', 'Account created. Check your email for the OTP.');
      router.replace('/verify-otp');
    } catch (err) {
      Alert.alert('Network error', 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Matric Number"
        autoCapitalize="characters"
        value={matricNumber}
        onChangeText={setMatricNumber}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <PasswordStrengthMeter password={password} />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2a9d8f',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
EOF

# --- app/intro.js ---
cat > app/intro.js << 'EOF'
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useRouter } from 'expo-router';

const DURATION_MS = 15000;
const NEXT_ROUTE = '/onboarding'; // change to your actual next screen

export default function IntroVideo() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const navigatedRef = useRef(false);

  const player = useVideoPlayer(require('../assets/intro.mp4'), (p) => {
    p.muted = true;
    p.loop = false;
    p.play();
  });

  const goNext = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace(NEXT_ROUTE);
  };

  useEventListener(player, 'playToEnd', goNext);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: DURATION_MS, useNativeDriver: false }).start();
    const timer = setTimeout(goNext, DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const widthInterpolate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
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
  skipButton: { position: 'absolute', top: 50, right: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  skipText: { color: '#fff', fontWeight: '600' },
  progressTrack: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
});
EOF

echo "Files created: components/PasswordStrengthMeter.js, app/register.js, app/intro.js"
echo "Installing expo-video..."
npx expo install expo-video

echo ""
echo "Setup complete. Two things left on you:"
echo "1. Drop your intro video at assets/intro.mp4"
echo "2. Swap REGISTER_ENDPOINT in app/register.js for your real API URL"
