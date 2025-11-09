import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
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
import { AppButton } from '@/components/ui/app-button';
import { cardShadow } from '@/constants/shadow';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useTopicStore } from '@/store/topicStore';

export default function AddFlashcardsScreen() {
  useStoreInitializer(useTopicStore);

  const router = useRouter();

  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const insets = useSafeAreaInsets();

  const topics = useTopicStore((state) => state.topics);
  const items = useTopicStore((state) => state.items);
  const cues = useTopicStore((state) => state.cues);
  const addItem = useTopicStore((state) => state.addItem);
  const removeTopic = useTopicStore((state) => state.removeTopic);
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

  const confirmDeleteTopic = useCallback(
    (topicId: string, topicName: string) => {
      Alert.alert(
        'Delete topic?',
        `“${topicName}” and its flashcards will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeTopic(topicId);
                if (activeTopicId === topicId) {
                  closeModal();
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to delete topic.';
                Alert.alert('Delete failed', message);
              }
            },
          },
        ]
      );
    },
    [activeTopicId, removeTopic]
  );

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
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Topics</ThemedText>
            <TouchableOpacity
              style={styles.addTopicButton}
              onPress={() => router.push('/import-document')}
              accessibilityRole="button"
              accessibilityLabel="Add topic">
              <Ionicons name="add" size={20} color="#0f1115" />
            </TouchableOpacity>
          </View>
          <ThemedText style={{ color: muted }}>
            Tap a topic to view flashcards, add cues, or import new material.
          </ThemedText>
        </View>
        <View style={styles.topicList}>
          {topicArray.length === 0 && !loading && (
            <ThemedText style={{ color: muted }}>
              No topics yet. Tap + above to import a document and create one.
            </ThemedText>
          )}
          {topicArray.map((topic) => {
            const cardCount = itemCounts[topic.id] ?? 0;
            const cueCount = cueCounts[topic.id] ?? 0;
            return (
              <SwipeableTopicCard
                key={topic.id}
                title={topic.name}
                subtitle={`${cardCount} cards • ${cueCount} cues`}
                onPress={() => openTopic(topic.id)}
                cardColor={cardColor}
                borderColor={borderColor}
                muted={muted}
                onDelete={() => confirmDeleteTopic(topic.id, topic.name)}
              />
            );
          })}
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
              <AppButton
                label={isSaving ? 'Saving…' : 'Add Flashcard'}
                onPress={onAddFlashcard}
                loading={isSaving}
                disabled={!canSave}
              />

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
    style={[styles.topicCard, { backgroundColor: cardColor }]}
    onPress={onPress}>
    <ThemedText type="defaultSemiBold">{title}</ThemedText>
    <ThemedText style={{ color: muted, marginTop: 6 }}>{subtitle}</ThemedText>
  </TouchableOpacity>
);

type SwipeableTopicCardProps = TopicCardProps & {
  onDelete: () => void;
};

const SwipeableTopicCard = ({ onDelete, ...rest }: SwipeableTopicCardProps) => {
  const swipeRef = useRef<Swipeable | null>(null);
  const danger = useThemeColor({}, 'danger');
  const cardColor = useThemeColor({}, 'card');

  const handleDelete = () => {
    swipeRef.current?.close();
    onDelete();
  };

  const renderActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [110, 0] });
    return (
      <Animated.View style={[styles.topicDeleteWrapper, { transform: [{ translateX }] }]}> 
        <TouchableOpacity style={[styles.topicDeleteAction, { backgroundColor: danger }]} onPress={handleDelete}>
          <Ionicons name="trash" size={18} color={cardColor} />
          <ThemedText type="defaultSemiBold" style={[styles.topicDeleteText, { color: cardColor }]}>
            Delete
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      overshootRight={false}
      renderRightActions={(progress) => renderActions(progress)}
      rightThreshold={40}
      friction={2}
      containerStyle={styles.swipeContainer}
      childrenContainerStyle={styles.swipeChildren}>
      <View style={styles.topicCardWrapper}>
        <TopicCard {...rest} />
      </View>
    </Swipeable>
  );
};

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addTopicButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9aed77',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicList: {
    gap: 12,
    overflow: 'visible',
    paddingVertical: 4,
  },
  swipeContainer: {
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  swipeChildren: {
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  topicCardWrapper: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  topicCard: {
    ...cardShadow,
    borderWidth: 0,
    borderRadius: 16,
    padding: 16,
  },
  topicDeleteWrapper: {
    width: 110,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: '100%',
  },
  topicDeleteAction: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 8,
    paddingHorizontal: 16,
  },
  topicDeleteText: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    ...cardShadow,
    borderRadius: 20,
    borderWidth: 0,
    padding: 20,
    maxHeight: '90%',
    marginHorizontal: 4,
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
    overflow: 'visible',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    minHeight: 56,
  },
  listHeading: {
    marginTop: 12,
  },
  flashcard: {
    ...cardShadow,
    borderWidth: 0,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
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
