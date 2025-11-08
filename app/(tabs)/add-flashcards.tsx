import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Topic = {
  id: string;
  name: string;
  cards: number;
  cueCount: number;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  cue: string;
};

const topics: Topic[] = [
  { id: '1', name: 'Photosynthesis', cards: 18, cueCount: 54 },
  { id: '2', name: 'Spanish Basics', cards: 25, cueCount: 40 },
  { id: '3', name: 'AWS Study', cards: 12, cueCount: 30 },
];

const initialFlashcards: Record<string, Flashcard[]> = {
  '1': [
    { id: 'p-1', front: 'Chlorophyll role', back: 'Captures sunlight energy', cue: 'sunlight catcher' },
    { id: 'p-2', front: 'Water splitting', back: 'Creates oxygen + electrons', cue: 'water to oxygen' },
  ],
  '2': [
    { id: 's-1', front: 'Hola', back: 'Hello', cue: 'hola greeting' },
    { id: 's-2', front: 'Gracias', back: 'Thank you', cue: 'gracias note' },
  ],
  '3': [
    { id: 'a-1', front: 'S3 durability', back: 'Designed for eleven 9s', cue: 'eleven nines' },
  ],
};

export default function AddFlashcardsScreen() {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');

  const [topicFlashcards, setTopicFlashcards] = useState<Record<string, Flashcard[]>>(initialFlashcards);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const openTopic = (topicId: string) => {
    setActiveTopicId(topicId);
    setFront('');
    setBack('');
  };

  const closeModal = () => {
    setActiveTopicId(null);
    setFront('');
    setBack('');
  };

  const topicName = activeTopicId ? topics.find((topic) => topic.id === activeTopicId)?.name : '';

  const activeFlashcards = activeTopicId ? topicFlashcards[activeTopicId] ?? [] : [];
  const canSave = front.trim().length > 0 && back.trim().length > 0 && Boolean(activeTopicId);

  const listEmpty = useMemo(
    () => (
      <ThemedText style={[styles.emptyText, { color: muted }]}>
        No flashcards yet. Add your first cue below.
      </ThemedText>
    ),
    [muted]
  );

  const onAddFlashcard = () => {
    if (!canSave || !activeTopicId) return;
    const newCard: Flashcard = {
      id: `${activeTopicId}-${Date.now()}`,
      front: front.trim(),
      back: back.trim(),
      cue: front.trim().slice(0, 20).toLowerCase(),
    };
    setTopicFlashcards((prev) => ({
      ...prev,
      [activeTopicId]: [newCard, ...(prev[activeTopicId] ?? [])],
    }));
    setFront('');
    setBack('');
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Topics</ThemedText>
          <ThemedText style={{ color: muted }}>
            Tap a topic to view flashcards, add cues, or preview audio.
          </ThemedText>
        </View>
        <View style={styles.topicList}>
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              title={topic.name}
              subtitle={`${topic.cards} cards • ${topic.cueCount} cues`}
              onPress={() => openTopic(topic.id)}
              cardColor={cardColor}
              borderColor={borderColor}
              muted={muted}
            />
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(activeTopicId)} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardColor, borderColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{topicName}</ThemedText>
              <TouchableOpacity onPress={closeModal}>
                <ThemedText type="link">Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.modalHint, { color: muted }]}>
              Flashcards feed Gemini cues and quizzes.
            </ThemedText>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <TextInput
                style={[styles.input, { borderColor, backgroundColor: '#00000033', color: '#ffffff' }]}
                placeholder="Front (term or question)"
                placeholderTextColor={muted}
                multiline
                value={front}
                onChangeText={setFront}
              />
              <TextInput
                style={[styles.input, { borderColor, backgroundColor: '#00000033', color: '#ffffff' }]}
                placeholder="Back (definition or answer)"
                placeholderTextColor={muted}
                multiline
                value={back}
                onChangeText={setBack}
              />
              <TouchableOpacity
                onPress={onAddFlashcard}
                disabled={!canSave}
                style={[
                  styles.primaryButton,
                  { backgroundColor: primary, opacity: canSave ? 1 : 0.4 },
                ]}>
                <ThemedText type="defaultSemiBold" style={styles.primaryText}>
                  Add Flashcard
                </ThemedText>
              </TouchableOpacity>

              <ThemedText type="subtitle" style={styles.listHeading}>
                Flashcards
              </ThemedText>

              {activeFlashcards.length === 0 ? (
                listEmpty
              ) : (
                activeFlashcards.map((item) => (
                  <View key={item.id} style={[styles.flashcard, { borderColor }]}>
                    <ThemedText type="defaultSemiBold">{item.front}</ThemedText>
                    <ThemedText style={[styles.flashcardBack, { color: muted }]}>
                      {item.back}
                    </ThemedText>
                    <View style={styles.cueRow}>
                      <ThemedText style={[styles.cueLabel, { color: muted }]}>
                        cue: “{item.cue}”
                      </ThemedText>
                      <TouchableOpacity onPress={() => alert(`Previewing ${item.cue}`)}>
                        <ThemedText type="link">Preview Cue</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

type TopicCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  cardColor: string;
  borderColor: string;
  muted: string;
};

const TopicCard = ({ title, subtitle, onPress, cardColor, borderColor, muted }: TopicCardProps) => (
  <TouchableOpacity
    style={[styles.topicCard, { backgroundColor: cardColor, borderColor }]}
    onPress={onPress}>
    <ThemedText type="defaultSemiBold">{title}</ThemedText>
    <ThemedText style={{ color: muted, marginTop: 6 }}>{subtitle}</ThemedText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  topicList: {
    gap: 12,
  },
  topicCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHint: {
    marginTop: 4,
    marginBottom: 12,
  },
  modalScroll: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    minHeight: 56,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  listHeading: {
    marginTop: 12,
  },
  flashcard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  flashcardBack: {
    marginTop: 8,
  },
  cueRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cueLabel: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
  },
});
