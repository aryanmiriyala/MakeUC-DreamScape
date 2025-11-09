import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useTopicStore } from '@/store/topicStore';

export default function AddFlashcardsScreen() {
  useStoreInitializer(useTopicStore);

  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const insets = useSafeAreaInsets();

  const topics = useTopicStore((state) => state.topics);
  const items = useTopicStore((state) => state.items);
  const cues = useTopicStore((state) => state.cues);
  const addItem = useTopicStore((state) => state.addItem);
  const loading = useTopicStore((state) => state.loading);

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const topicArray = useMemo(() => Object.values(topics), [topics]);
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(items).forEach((item) => {
      counts[item.topicId] = (counts[item.topicId] ?? 0) + 1;
    });
    return counts;
  }, [items]);
  const cueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(cues).forEach((cue) => {
      const topicId = cue.topicId ?? items[cue.itemId]?.topicId;
      if (!topicId) return;
      counts[topicId] = (counts[topicId] ?? 0) + 1;
    });
    return counts;
  }, [cues, items]);
  const topicName = activeTopicId ? topics[activeTopicId]?.name ?? '' : '';
  const activeFlashcards = useMemo(
    () =>
      activeTopicId
        ? Object.values(items)
            .filter((item) => item.topicId === activeTopicId)
            .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
        : [],
    [activeTopicId, items]
  );
  const canSave = front.trim().length > 0 && back.trim().length > 0 && Boolean(activeTopicId);

  const listEmpty = useMemo(
    () => (
      <ThemedText style={[styles.emptyText, { color: muted }]}>
        No flashcards yet. Add your first cue below.
      </ThemedText>
    ),
    [muted]
  );

  const onAddFlashcard = async () => {
    if (!canSave || !activeTopicId) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await addItem(activeTopicId, {
        front: front.trim(),
        back: back.trim(),
        cueText: front.trim().slice(0, 48),
      });
      setFront('');
      setBack('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save flashcard.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Topics</ThemedText>
          <ThemedText style={{ color: muted }}>
            Tap a topic to view flashcards, add cues, or preview audio.
          </ThemedText>
        </View>
        <View style={styles.topicList}>
          {topicArray.length === 0 && !loading && (
            <ThemedText style={{ color: muted }}>
              No topics yet. Create one from the Home screen to start adding flashcards.
            </ThemedText>
          )}
          {topicArray.map((topic) => {
            const cardCount = itemCounts[topic.id] ?? 0;
            const cueCount = cueCounts[topic.id] ?? 0;
            return (
              <TopicCard
              key={topic.id}
              title={topic.name}
              subtitle={`${cardCount} cards • ${cueCount} cues`}
              onPress={() => openTopic(topic.id)}
              cardColor={cardColor}
              borderColor={borderColor}
              muted={muted}
            />
          )})}
          {loading && (
            <ThemedText style={{ color: muted }}>Loading topics…</ThemedText>
          )}
        </View>
      </ScrollView>

      <Modal visible={Boolean(activeTopicId)} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
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
              {formError && (
                <ThemedText style={[styles.errorText, { color: primary }]}>{formError}</ThemedText>
              )}
              <TouchableOpacity
                onPress={onAddFlashcard}
                disabled={!canSave || isSaving}
                style={[
                  styles.primaryButton,
                  { backgroundColor: primary, opacity: canSave && !isSaving ? 1 : 0.4 },
                ]}>
                <ThemedText type="defaultSemiBold" style={styles.primaryText}>
                  {isSaving ? 'Saving…' : 'Add Flashcard'}
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
                        cue: “{item.cueText ?? '—'}”
                      </ThemedText>
                      <TouchableOpacity onPress={() => alert(`Previewing ${item.cueText ?? ''}`)}>
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
  errorText: {
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
});
