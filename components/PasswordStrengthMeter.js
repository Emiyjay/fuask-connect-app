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
