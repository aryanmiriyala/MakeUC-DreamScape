import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Flashcard = {
  id: string;
  front: string;
  back: string;
  cue: string;
};

const fallbackTopics: Record<string, string> = {
  '1': 'Photosynthesis',
  '2': 'Spanish Basics',
  '3': 'AWS Study',
};

export default function AddFlashcardsScreen() {
  const params = useLocalSearchParams<{ topicId?: string; topicName?: string }>();
  const topicName = params.topicName ?? fallbackTopics[params.topicId ?? ''] ?? 'New Topic';
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    { id: '1', front: 'Chlorophyll role', back: 'Captures sunlight energy', cue: 'sunlight catcher' },
    { id: '2', front: 'Water splitting', back: 'Creates oxygen + electrons', cue: 'water to oxygen' },
  ]);

  const canSave = front.trim().length > 0 && back.trim().length > 0;

  const onAddFlashcard = () => {
    if (!canSave) return;
    setFlashcards((prev) => [
      {
        id: `${Date.now()}`,
        front: front.trim(),
        back: back.trim(),
        cue: front.trim().slice(0, 18).toLowerCase(),
      },
      ...prev,
    ]);
    setFront('');
    setBack('');
  };

  const renderItem: ListRenderItem<Flashcard> = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
      <ThemedText type="defaultSemiBold">{item.front}</ThemedText>
      <ThemedText style={[styles.cardBack, { color: muted }]}>{item.back}</ThemedText>
      <View style={styles.cueRow}>
        <ThemedText style={[styles.cueLabel, { color: muted }]}>cue: “{item.cue}”</ThemedText>
        <TouchableOpacity onPress={() => alert(`Previewing ${item.cue}`)}>
          <ThemedText type="link">Preview Cue</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const listEmpty = useMemo(
    () => (
      <ThemedText style={[styles.emptyText, { color: muted }]}>
        No flashcards yet. Add your first cue above.
      </ThemedText>
    ),
    [muted]
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText type="subtitle">{`Topic: ${topicName}`}</ThemedText>
          <ThemedText style={[styles.subline, { color: muted }]}>
            Flashcards feed Gemini cues and quizzes.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor, backgroundColor: cardColor, color: muted }]}
            placeholder="Front (term or question)"
            placeholderTextColor={muted}
            multiline
            value={front}
            onChangeText={setFront}
          />
          <TextInput
            style={[styles.input, { borderColor, backgroundColor: cardColor, color: muted }]}
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
        </View>

        <ThemedText type="subtitle">Flashcards</ThemedText>
        <FlatList
          data={flashcards}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          scrollEnabled={false}
          ListEmptyComponent={listEmpty}
        />
      </ScrollView>
    </ThemedView>
  );
}

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
  subline: {
    fontSize: 14,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    minHeight: 60,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardBack: {
    marginTop: 8,
  },
  cueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cueLabel: {
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
