import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

const intervals = [3, 5, 10] as const;

export default function SleepModeScreen() {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<'Ready' | 'Playing' | 'Stopped'>('Ready');
  const [selectedInterval, setSelectedInterval] = useState<(typeof intervals)[number]>(5);
  const [cuesPlayed, setCuesPlayed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (status !== 'Playing') return;
    const timer = setInterval(() => {
      setCuesPlayed((count) => count + 1);
    }, selectedInterval * 1000);
    return () => clearInterval(timer);
  }, [status, selectedInterval]);

  const startSession = () => {
    setStatus('Playing');
    setCuesPlayed(0);
  };

  const stopSession = () => {
    setStatus('Stopped');
  };

  const pulseStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    }),
    [pulse]
  );

  return (
    <ThemedView
      style={[
        styles.screen,
        { paddingTop: insets.top + 12, paddingBottom: Math.max(24, insets.bottom + 16) },
      ]}>
      <View style={styles.content}>
        <ThemedText type="subtitle">Sleep Mode</ThemedText>
        <ThemedText style={[styles.subtitle, { color: muted }]}>
          Simulate spaced cues with TTS while resting.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText>Status: {status}</ThemedText>
          <ThemedText style={{ color: muted }}>Cues played: {cuesPlayed}</ThemedText>
          <Animated.Text style={[styles.pulseText, { color: muted }, pulseStyle]}>
            💤 Reinforcing memories…
          </Animated.Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">Cue interval</ThemedText>
          <View style={styles.intervalRow}>
            {intervals.map((value) => {
              const isActive = value === selectedInterval;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.intervalChip,
                    {
                      borderColor,
                      backgroundColor: isActive ? success : 'transparent',
                      opacity: status === 'Playing' ? 0.7 : 1,
                    },
                  ]}
                  disabled={status === 'Playing'}
                  onPress={() => setSelectedInterval(value)}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: isActive ? '#0f1115' : muted }}>
                    {value}s
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: success }]}
            onPress={startSession}
            disabled={status === 'Playing'}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Start Sleep Session
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: danger }]}
            onPress={stopSession}
            disabled={status !== 'Playing'}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Stop
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
  },
  content: {
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  pulseText: {
    marginTop: 4,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  intervalChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 999,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
  },
});
