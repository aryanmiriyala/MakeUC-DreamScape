import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { fetchCueAudio } from '@/lib/elevenlabs';
import { useSleepStore } from '@/store/sleepStore';
import { useTopicStore } from '@/store/topicStore';
import { useStoreInitializer } from '../../hooks/use-store-initializer';

const intervals = [3, 5, 10] as const;

type SessionStatus = 'idle' | 'preparing' | 'playing';

type PreparedCue = {
  key: string;
  text: string;
  uri: string;
  itemId: string;
  topicId: string;
  cueId?: string;
};

export default function SleepModeScreen() {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const insets = useSafeAreaInsets();

  useStoreInitializer(useTopicStore);
  useStoreInitializer(useSleepStore);

  const topics = useTopicStore((state) => state.topics);
  const items = useTopicStore((state) => state.items);
  const cues = useTopicStore((state) => state.cues);
  const topicsLoading = useTopicStore((state) => state.loading);

  const startSession = useSleepStore((state) => state.startSession);
  const logCueEvent = useSleepStore((state) => state.logCueEvent);
  const completeSession = useSleepStore((state) => state.completeSession);
  const cancelSession = useSleepStore((state) => state.cancelSession);

  const [status, setStatus] = useState<SessionStatus>('idle');
  const [selectedInterval, setSelectedInterval] = useState<(typeof intervals)[number]>(5);
  const [cuesPlayed, setCuesPlayed] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preparedCues, setPreparedCues] = useState<PreparedCue[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const preparedRef = useRef<PreparedCue[]>([]);
  const currentCueIndexRef = useRef(0);
  const playedCueIdsRef = useRef<Set<string>>(new Set());

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
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const topicOptions = useMemo(() => Object.values(topics), [topics]);

  useEffect(() => {
    if (!selectedTopicId && topicOptions.length > 0) {
      setSelectedTopicId(topicOptions[0].id);
    }
  }, [selectedTopicId, topicOptions]);

  const activeItems = useMemo(() => {
    if (!selectedTopicId) {
      return [];
    }
    return Object.values(items).filter((item) => item.topicId === selectedTopicId);
  }, [items, selectedTopicId]);

  const cueSources = useMemo(() => {
    if (!selectedTopicId) {
      return [];
    }

    const list: PreparedCue[] = [];

    activeItems.forEach((item) => {
      const itemCues = Object.values(cues).filter((cue) => cue.itemId === item.id);

      if (itemCues.length === 0) {
        const fallback = item.cueText ?? item.front;
        if (fallback?.trim()) {
          list.push({
            key: `${item.id}-fallback`,
            text: fallback,
            uri: '',
            itemId: item.id,
            topicId: selectedTopicId,
          });
        }
        return;
      }

      itemCues.forEach((cue) => {
        const text = cue.cueText ?? item.front;
        if (text?.trim()) {
          list.push({
            key: cue.id,
            text,
            uri: '',
            itemId: item.id,
            topicId: selectedTopicId,
            cueId: cue.id,
          });
        }
      });
    });

    return list;
  }, [activeItems, cues, selectedTopicId]);

  const cleanupAudio = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  const stopSleepSession = useCallback(
    async (mode: 'user' | 'error' | 'completed' = 'user') => {
      await cleanupAudio();

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;

      const cueIdsPlayed = Array.from(playedCueIdsRef.current);
      playedCueIdsRef.current.clear();

      if (sessionId) {
        try {
          if (mode === 'completed') {
            await completeSession(sessionId, {
              cueIdsPlayed,
              interruptions: 0,
            });
          } else {
            await cancelSession(sessionId, mode === 'error' ? 'Playback interrupted by error' : 'Stopped manually');
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('Failed to close sleep session', error);
          }
        }
      }

      if (mode === 'user') {
        setErrorMessage(null);
      }

      preparedRef.current = [];
      setPreparedCues([]);
      setStatus('idle');
    },
    [cancelSession, cleanupAudio, completeSession]
  );

  const playCueAtIndex = useCallback(
    async (index: number) => {
      const cuesToPlay = preparedRef.current;
      const cue = cuesToPlay[index];
      if (!cue) {
        return;
      }

      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: cue.uri },
          { shouldPlay: true }
        );

        soundRef.current = sound;
        currentCueIndexRef.current = index;
        setCuesPlayed((count) => count + 1);
        playedCueIdsRef.current.add(cue.cueId ?? cue.itemId);

        const sessionId = sessionIdRef.current;
        if (sessionId) {
          void logCueEvent({
            sessionId,
            topicId: cue.topicId,
            itemId: cue.itemId,
            cueId: cue.cueId,
            volume: 1,
            status: 'played',
          }).catch((error) => {
            if (__DEV__) {
              console.warn('Failed to log cue event', error);
            }
          });
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to play cue');
        void stopSleepSession('error');
      }
    },
    [logCueEvent, stopSleepSession]
  );

  const handleStart = useCallback(async () => {
    if (!selectedTopicId) {
      setErrorMessage('Select a topic to start playback.');
      return;
    }

    if (cueSources.length === 0) {
      setErrorMessage('No cues found for this topic. Add cues in Flashcards first.');
      return;
    }

    setStatus('preparing');
    setErrorMessage(null);
    setIsPreparing(true);
    setCuesPlayed(0);
    playedCueIdsRef.current.clear();

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const prepared: PreparedCue[] = [];

      for (const cue of cueSources) {
        const audio = await fetchCueAudio(cue.text);
        prepared.push({ ...cue, uri: audio.uri });
      }

      preparedRef.current = prepared;
      setPreparedCues(prepared);

      const session = await startSession({
        topicId: selectedTopicId,
        plannedCueIds: prepared.map((cue) => cue.cueId ?? cue.itemId),
      });

      sessionIdRef.current = session.id;

      await playCueAtIndex(0);

      if (prepared.length > 1) {
        intervalRef.current = setInterval(() => {
          const cuesToPlay = preparedRef.current;
          if (cuesToPlay.length === 0) {
            return;
          }
          const nextIndex = (currentCueIndexRef.current + 1) % cuesToPlay.length;
          currentCueIndexRef.current = nextIndex;
          void playCueAtIndex(nextIndex);
        }, selectedInterval * 1000);
      }

      setStatus('playing');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start sleep session');
      await stopSleepSession('error');
    } finally {
      setIsPreparing(false);
    }
  }, [cueSources, playCueAtIndex, selectedInterval, selectedTopicId, startSession, stopSleepSession]);

  const handleStop = useCallback(() => {
    void stopSleepSession('user');
  }, [stopSleepSession]);

  const pulseStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    }),
    [pulse]
  );

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'preparing':
        return 'Preparing audio…';
      case 'playing':
        return 'Playing';
      default:
        return 'Ready';
    }
  }, [status]);

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
          <ThemedText>Status: {statusLabel}</ThemedText>
          <ThemedText style={{ color: muted }}>Cues played: {cuesPlayed}</ThemedText>
          <Animated.Text style={[styles.pulseText, { color: muted }, pulseStyle]}>
            💤 Reinforcing memories…
          </Animated.Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">Select topic</ThemedText>
          <View style={styles.topicRow}>
            {topicsLoading && topicOptions.length === 0 ? (
              <ThemedText style={{ color: muted }}>Loading topics…</ThemedText>
            ) : null}
            {topicOptions.map((topic) => {
              const isActive = topic.id === selectedTopicId;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicChip,
                    {
                      borderColor,
                      backgroundColor: isActive ? success : 'transparent',
                      opacity: status !== 'idle' ? 0.6 : 1,
                    },
                  ]}
                  disabled={status !== 'idle'}
                  onPress={() => setSelectedTopicId(topic.id)}>
                  <ThemedText type="defaultSemiBold" style={{ color: isActive ? '#0f1115' : muted }}>
                    {topic.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedTopicId && cueSources.length === 0 ? (
            <ThemedText style={{ color: muted }}>
              This topic has no cues yet. Add flashcards with cues to enable playback.
            </ThemedText>
          ) : null}
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
                      opacity: status === 'playing' ? 0.7 : 1,
                    },
                  ]}
                  disabled={status === 'playing'}
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

        {preparedCues.length > 0 ? (
          <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
            <ThemedText type="defaultSemiBold">Queued cues</ThemedText>
            <View style={styles.cueList}>
              {preparedCues.map((cue) => (
                <ThemedText key={cue.key} style={{ color: muted }}>
                  • {cue.text}
                </ThemedText>
              ))}
            </View>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={[styles.card, { borderColor: '#f87171', backgroundColor: '#fca5a533' }]}>
            <ThemedText type="defaultSemiBold" style={{ color: '#7f1d1d' }}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: success, opacity: status === 'idle' ? 1 : 0.6 }]}
            onPress={handleStart}
            disabled={status !== 'idle' || isPreparing}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {isPreparing ? 'Preparing…' : 'Start Sleep Session'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: danger, opacity: status === 'playing' ? 1 : 0.4 }]}
            onPress={handleStop}
            disabled={status !== 'playing'}>
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
    paddingHorizontal: 24,
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
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  topicChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
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
    marginBottom: 24,
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
  cueList: {
    gap: 6,
    marginTop: 8,
  },
});
