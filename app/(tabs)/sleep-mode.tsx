import { Audio } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { cardSurface } from '@/constants/shadow';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  fetchAmbientPreset,
  fetchCueAudio,
  type AmbientPreset
} from '@/lib/elevenlabs';
import { useSleepStore } from '@/store/sleepStore';
import { useTopicStore } from '@/store/topicStore';
import { useStoreInitializer } from '../../hooks/use-store-initializer';

const AMBIENT_OPTIONS: Array<{ key: AmbientPreset | 'none'; label: string; emoji: string }> = [
  { key: 'none', label: 'No Music', emoji: '🔇' },
  { key: 'lofi', label: 'Lo-Fi', emoji: '🎵' },
  { key: 'rain', label: 'Rain', emoji: '🌧️' },
  { key: 'ocean', label: 'Ocean', emoji: '🌊' },
  { key: 'forest', label: 'Forest', emoji: '🌲' },
  { key: 'piano', label: 'Piano', emoji: '🎹' },
  { key: 'white_noise', label: 'White Noise', emoji: '⚪' },
];

const VOICE_OPTIONS = [
  { id: 'Qggl4b0xRMiqOwhPtVWT', label: 'Clara' },
  { id: 'uhYnkYTBc711oAY590Ea', label: 'Charlotte' },
  { id: 'CsCH98UfIgwEiNogGKjk', label: 'Sean' },
  { id: 'n8whxsxd0DgU7GRem9k9', label: 'Bruno' },
] as const;

const VOICE_SAMPLE_TEXT = 'Hi! Thanks for checking out DreamScape.';
const VOICE_PREVIEW_VOLUME = 0.9;
const AMBIENT_LOOP_VOLUME = 0.35;
const AMBIENT_DUCKED_VOLUME = 0.12;
const AMBIENT_PREVIEW_DURATION = 15; // seconds

function chunkOptions<T>(options: T[], size = 2): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < options.length; index += size) {
    chunks.push(options.slice(index, index + size));
  }
  return chunks;
}

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
  const router = useRouter();
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const buttonBlue = useThemeColor({ light: '#2563eb', dark: '#1d4ed8' }, 'primary');
  const buttonBlueMuted = useThemeColor({ light: '#c7d7ff', dark: '#1e2a4a' }, 'card');
  const activeSurface = buttonBlue;
  const inactiveSurface = buttonBlueMuted;
  const activeTextColor = '#f8fafc';
  const inactiveTextColor = '#0f1115';
  const optionTextColor = '#f8fafc';
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
  const [selectedInterval] = useState(5);
  const [cuesPlayed, setCuesPlayed] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientPreset | 'none'>('lofi');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_OPTIONS[0].id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preparedCues, setPreparedCues] = useState<PreparedCue[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [isPreviewingAmbient, setIsPreviewingAmbient] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const ambientPreviewRef = useRef<Audio.Sound | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<SessionStatus>('idle');
  const preparedRef = useRef<PreparedCue[]>([]);
  const currentCueIndexRef = useRef(0);
  const playedCueIdsRef = useRef<Set<string>>(new Set());
  const previewVoiceIdRef = useRef<string | null>(null);
  const previewAmbientKeyRef = useRef<AmbientPreset | 'none' | null>(null);

  const stopSound = useCallback(async (ref: React.MutableRefObject<Audio.Sound | null>) => {
    if (!ref.current) return;
    try {
      await ref.current.stopAsync();
    } catch {
      // ignore stop errors
    }
    try {
      await ref.current.unloadAsync();
    } catch {
      // ignore unload errors
    }
    ref.current = null;
  }, []);

  const ensureAudioMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  const stopVoicePreview = useCallback(async () => {
    previewVoiceIdRef.current = null;
    setIsPreviewingVoice(false);
    await stopSound(previewSoundRef);
  }, [stopSound]);

  const stopAmbientPreview = useCallback(async () => {
    previewAmbientKeyRef.current = null;
    setIsPreviewingAmbient(false);
    await stopSound(ambientPreviewRef);
  }, [stopSound]);

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
      if (ambientSoundRef.current) {
        void ambientSoundRef.current.unloadAsync();
        ambientSoundRef.current = null;
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
      const snippet = [item.back, item.front].filter(Boolean).join('. ').trim();

      if (itemCues.length === 0) {
        const fallback = snippet || item.cueText || item.front;
        if (fallback?.trim()) {
          list.push({
            key: `${item.id}-fallback`,
            text: fallback.trim(),
            uri: '',
            itemId: item.id,
            topicId: selectedTopicId,
          });
        }
        return;
      }

      itemCues.forEach((cue) => {
        const composed = cue.cueText
          ? `${cue.cueText}. ${snippet}`.trim()
          : snippet || cue.cueText || item.front;
        if (composed?.trim()) {
          list.push({
            key: cue.id,
            text: composed.trim(),
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
    await stopSound(soundRef);
    await stopSound(ambientSoundRef);
    await stopVoicePreview();
    await stopAmbientPreview();
  }, [stopAmbientPreview, stopSound, stopVoicePreview]);

  const stopSleepSession = useCallback(
    async (mode: 'user' | 'error' | 'completed' = 'user') => {
      await cleanupAudio();

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;

      const cueIdsPlayed = Array.from(playedCueIdsRef.current);
      const hasPlayedCues = cueIdsPlayed.length > 0;
      playedCueIdsRef.current.clear();

      if (sessionId) {
        try {
          // If user stopped manually BUT played at least one cue, mark as completed
          // This allows Morning Quiz to generate questions from partial sessions
          if (mode === 'completed' || (mode === 'user' && hasPlayedCues)) {
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
      statusRef.current = 'idle';
      setIsPreparing(false);
    },
    [cancelSession, cleanupAudio, completeSession]
  );

  const startVoicePreview = useCallback(
    async (voiceId: string) => {
      try {
        await ensureAudioMode();
        previewVoiceIdRef.current = voiceId;
        setIsPreviewingVoice(true);

        const previewAudio = await fetchCueAudio(VOICE_SAMPLE_TEXT, { voiceId });
        const { sound } = await Audio.Sound.createAsync(
          { uri: previewAudio.uri },
          { shouldPlay: true, volume: VOICE_PREVIEW_VOLUME }
        );
        previewSoundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            return;
          }
          if (status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            void stopVoicePreview();
          }
        });
      } catch (error) {
        console.error('Voice preview failed', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to preview voice');
        await stopVoicePreview();
      }
    },
    [ensureAudioMode, stopVoicePreview]
  );

  const startAmbientPreview = useCallback(
    async (preset: AmbientPreset) => {
      try {
        await ensureAudioMode();
        previewAmbientKeyRef.current = preset;
        setIsPreviewingAmbient(true);

        const ambientAudio = await fetchAmbientPreset(preset, AMBIENT_PREVIEW_DURATION);
        const { sound } = await Audio.Sound.createAsync(
          { uri: ambientAudio.uri },
          { shouldPlay: true, isLooping: false, volume: AMBIENT_LOOP_VOLUME }
        );
        ambientPreviewRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            return;
          }
          if (status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            void stopAmbientPreview();
          }
        });
      } catch (error) {
        console.error('Ambient preview failed', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to preview ambience');
        await stopAmbientPreview();
      }
    },
    [ensureAudioMode, stopAmbientPreview]
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

        // Duck ambient audio during cue playback (lower volume)
        if (ambientSoundRef.current) {
          await ambientSoundRef.current.setVolumeAsync(AMBIENT_DUCKED_VOLUME);
        }

        const { sound } = await Audio.Sound.createAsync({ uri: cue.uri });
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

        await sound.playAsync();
        return new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              sound.setOnPlaybackStatusUpdate(null);
              // Restore ambient volume after cue finishes
              if (ambientSoundRef.current) {
                void ambientSoundRef.current.setVolumeAsync(AMBIENT_LOOP_VOLUME);
              }
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('SleepMode cue playback failed', error);
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
    statusRef.current = 'preparing';
    setErrorMessage(null);
    setIsPreparing(true);
    setCuesPlayed(0);
    playedCueIdsRef.current.clear();

    try {
      await stopVoicePreview();
      await stopAmbientPreview();
      await ensureAudioMode();

      const prepared: PreparedCue[] = [];

      for (const cue of cueSources) {
        const audio = await fetchCueAudio(cue.text, { voiceId: selectedVoiceId });
        prepared.push({ ...cue, uri: audio.uri });
      }

      preparedRef.current = prepared;
      setPreparedCues(prepared);

      // Start ambient background music if selected
      if (selectedAmbient !== 'none') {
        try {
          const ambientAudio = await fetchAmbientPreset(selectedAmbient, 30); // API max duration
          const { sound: ambientSound } = await Audio.Sound.createAsync(
            { uri: ambientAudio.uri },
            { 
              shouldPlay: true, 
              isLooping: true,
              volume: AMBIENT_LOOP_VOLUME,
            }
          );
          ambientSoundRef.current = ambientSound;
        } catch (ambientError) {
          console.warn('Failed to load ambient audio, continuing without it:', ambientError);
          // Don't fail the whole session if ambient fails
        }
      }

      const session = await startSession({
        topicId: selectedTopicId,
        plannedCueIds: prepared.map((cue) => cue.cueId ?? cue.itemId),
      });

      sessionIdRef.current = session.id;

      setStatus('playing');
      statusRef.current = 'playing';

      await playCueAtIndex(0);

      const playLoop = async () => {
        const cuesToPlay = preparedRef.current;
        if (cuesToPlay.length === 0) {
          return;
        }
        currentCueIndexRef.current = (currentCueIndexRef.current + 1) % cuesToPlay.length;
        await new Promise((resolve) => setTimeout(resolve, selectedInterval * 1000));
        await playCueAtIndex(currentCueIndexRef.current);
        if (statusRef.current === 'playing') {
          void playLoop();
        }
      };

      void playLoop();
    } catch (error) {
      console.error('SleepMode handleStart failed', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start sleep session');
      await stopSleepSession('error');
    } finally {
      setIsPreparing(false);
    }
  }, [cueSources, playCueAtIndex, selectedAmbient, selectedInterval, selectedTopicId, selectedVoiceId, startSession, stopSleepSession]);

  const handleStop = useCallback(() => {
    void stopSleepSession('user');
    statusRef.current = 'idle';
  }, [stopSleepSession]);

  const handlePreviewVoice = useCallback(async () => {
    if (status !== 'idle') {
      setErrorMessage('Stop the current session before previewing a voice.');
      return;
    }

    if (isPreviewingVoice && previewVoiceIdRef.current === selectedVoiceId) {
      await stopVoicePreview();
      return;
    }

    if (isPreviewingVoice) {
      await stopVoicePreview();
    }

    await startVoicePreview(selectedVoiceId);
  }, [isPreviewingVoice, selectedVoiceId, startVoicePreview, status, stopVoicePreview]);

  const handleSelectVoice = useCallback(
    async (voiceId: string) => {
      if (status !== 'idle') {
        return;
      }
      if (voiceId === selectedVoiceId) {
        if (isPreviewingVoice) {
          await stopVoicePreview();
        }
        return;
      }

      setSelectedVoiceId(voiceId);
      if (isPreviewingVoice) {
        await stopVoicePreview();
        await startVoicePreview(voiceId);
      }
    },
    [isPreviewingVoice, selectedVoiceId, startVoicePreview, status, stopVoicePreview]
  );

  const handlePreviewAmbient = useCallback(async () => {
    if (selectedAmbient === 'none') {
      setErrorMessage('Select an ambience preset to preview.');
      return;
    }

    if (status !== 'idle') {
      setErrorMessage('Stop the current session before previewing ambience.');
      return;
    }

    if (isPreviewingAmbient && previewAmbientKeyRef.current === selectedAmbient) {
      await stopAmbientPreview();
      return;
    }

    if (isPreviewingAmbient) {
      await stopAmbientPreview();
    }

    await startAmbientPreview(selectedAmbient);
  }, [
    isPreviewingAmbient,
    selectedAmbient,
    startAmbientPreview,
    status,
    stopAmbientPreview,
  ]);

  const handleSelectAmbient = useCallback(
    async (preset: AmbientPreset | 'none') => {
      if (status !== 'idle') {
        return;
      }

      setSelectedAmbient(preset);
      if (isPreviewingAmbient) {
        await stopAmbientPreview();
      }
    },
    [isPreviewingAmbient, status, stopAmbientPreview]
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setErrorMessage(null);
        void stopSleepSession('user');
        statusRef.current = 'idle';
      };
    }, [stopSleepSession])
  );

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

  const previewLocked = status !== 'idle';
  const voicePreviewDisabled = previewLocked && !isPreviewingVoice;
  const ambientPreviewDisabled =
    (selectedAmbient === 'none' || previewLocked) && !isPreviewingAmbient;
  const voicePreviewLabel = isPreviewingVoice ? '■  Stop voice preview' : '▶  Preview voice';
  const ambientPreviewLabel =
    selectedAmbient === 'none'
      ? 'Select ambience to preview'
      : isPreviewingAmbient
        ? '■  Stop ambience preview'
        : '▶  Preview ambience';

  return (
    <ThemedView
      style={[
        styles.screen,
        { paddingTop: insets.top + 12 },
      ]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeading
          title="Sleep Mode"
          subtitle="Simulate spaced cues with TTS while resting."
          spacing={16}
        />

        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText>Status: {statusLabel}</ThemedText>
          <ThemedText style={{ color: muted }}>Cues played: {cuesPlayed}</ThemedText>
          <Animated.Text style={[styles.pulseText, { color: muted }, pulseStyle]}>
            💤 Reinforcing memories…
          </Animated.Text>
        </View>

        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold">Select topic</ThemedText>
          {topicsLoading && topicOptions.length === 0 ? (
            <ThemedText style={{ color: muted, textAlign: 'center' }}>Loading topics…</ThemedText>
          ) : null}
          <View style={styles.topicColumn}>
            {topicOptions.map((topic) => {
              const isActive = topic.id === selectedTopicId;
              const backgroundColor = isActive ? activeSurface : inactiveSurface;
              const label = topic.name?.trim() || topic.shortName || 'Untitled topic';
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.optionButton,
                    styles.topicButton,
                    styles.flatButton,
                    { backgroundColor, opacity: status !== 'idle' ? 0.7 : 1 },
                  ]}
                  disabled={status !== 'idle'}
                  onPress={() => setSelectedTopicId(topic.id)}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.optionLabel,
                      styles.topicLabel,
                      { color: isActive ? activeTextColor : inactiveTextColor },
                    ]}>
                    {label}
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

        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold">✨ Background ambience (Pro)</ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted, fontSize: 12, marginTop: 4 }]}>
            ElevenLabs generates AI ambient sounds that loop softly while cues play. Volume auto-ducks during speech.
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ambientScroll}
            contentContainerStyle={styles.ambientRow}>
            {AMBIENT_OPTIONS.map((option) => {
              const isActive = option.key === selectedAmbient;
              const backgroundColor = isActive ? activeSurface : inactiveSurface;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.ambientChip,
                    styles.flatButton,
                    { backgroundColor, opacity: status !== 'idle' ? 0.7 : 1 },
                  ]}
                  disabled={status !== 'idle'}
                  onPress={() => handleSelectAmbient(option.key)}>
                  <ThemedText style={styles.optionEmoji}>{option.emoji}</ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.optionLabel,
                      styles.ambientLabel,
                      { color: isActive ? activeTextColor : inactiveTextColor },
                    ]}>
                    {option.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.previewButton,
              styles.ambientPreviewButton,
              cardSurface(activeSurface),
              ambientPreviewDisabled ? styles.disabledButton : null,
            ]}
            onPress={handlePreviewAmbient}
            disabled={ambientPreviewDisabled}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.previewButtonText, { color: optionTextColor }]}>
              {ambientPreviewLabel}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold">Voice persona</ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Pick who delivers cues. Preview plays “Hi! Thanks for checking out DreamScape.”
          </ThemedText>
          <View style={styles.optionGrid}>
            {chunkOptions([...VOICE_OPTIONS], 2).map((row, rowIndex) => (
              <View key={`voice-row-${rowIndex}`} style={styles.optionRow}>
                {row.map((option) => {
                  const isActive = option.id === selectedVoiceId;
                  const backgroundColor = isActive ? activeSurface : inactiveSurface;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        styles.flatButton,
                        { backgroundColor, opacity: status !== 'idle' ? 0.7 : 1 },
                      ]}
                      disabled={status !== 'idle'}
                      onPress={() => handleSelectVoice(option.id)}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.optionLabel,
                          { color: isActive ? activeTextColor : inactiveTextColor },
                        ]}>
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
                {row.length < 2 ? <View style={styles.optionPlaceholder} /> : null}
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.previewButton,
              styles.voicePreviewButton,
              cardSurface(activeSurface),
              isPreviewingVoice ? styles.previewActive : null,
              voicePreviewDisabled ? styles.disabledButton : null,
            ]}
            onPress={handlePreviewVoice}
            disabled={voicePreviewDisabled}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.previewButtonText, { color: optionTextColor }]}>
              {voicePreviewLabel}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {preparedCues.length > 0 ? (
          <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
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
          <View
            style={[
              styles.card,
              cardSurface('#fca5a533'),
              { borderColor: '#f87171', backgroundColor: '#fca5a533' },
            ]}>
            <ThemedText type="defaultSemiBold" style={{ color: '#7f1d1d', marginBottom: 12 }}>
              {errorMessage}
            </ThemedText>
            {cueSources.length === 0 && (
              <>
                <ThemedText style={{ color: '#7f1d1d', fontSize: 14, marginBottom: 12 }}>
                  💡 To use Sleep Mode, you need to create flashcards first:
                </ThemedText>
                <ThemedText style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 8 }}>
                  1. Go to "Add Flashcards" tab{'\n'}
                  2. Create a topic or select one{'\n'}
                  3. Add flashcard items (front/back){'\n'}
                  4. Come back here to start learning!
                </ThemedText>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              cardSurface(activeSurface),
              { marginTop: 8 },
            ]}
            onPress={() => router.push('/add-flashcards')}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Go to Add Flashcards
            </ThemedText>
          </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              cardSurface(activeSurface),
              { opacity: status === 'idle' ? 1 : 0.6, borderColor, borderWidth: 1 },
            ]}
            onPress={handleStart}
            disabled={status !== 'idle' || isPreparing}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {isPreparing ? 'Preparing…' : 'Start'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              cardSurface('#3b1921'),
              { opacity: status === 'playing' ? 1 : 0.4, borderColor: '#5f1e1e', borderWidth: 1 },
            ]}
            onPress={handleStop}
            disabled={status !== 'playing'}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Stop
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    marginHorizontal: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 14,
  },
  pulseText: {
    marginTop: 4,
  },
  ambientScroll: {
    marginTop: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  ambientRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  ambientChip: {
    width: 78,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionGrid: {
    gap: 12,
    marginTop: 12,
    overflow: 'visible',
  },
  topicColumn: {
    gap: 12,
    marginTop: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    overflow: 'visible',
  },
  optionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'visible',
  },
  topicButton: {
    width: '100%',
    alignItems: 'flex-start',
  },
  topicLabel: {
    textAlign: 'left',
  },
  flatButton: {
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  optionPlaceholder: {
    flex: 1,
    opacity: 0,
    minHeight: 60,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionLabel: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
  },
  ambientLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewButton: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  ambientPreviewButton: {},
  voicePreviewButton: {},
  previewButtonText: {
    textAlign: 'center',
  },
  previewActive: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 4,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
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
