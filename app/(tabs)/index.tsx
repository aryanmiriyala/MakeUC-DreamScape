import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Topic = {
  id: string;
  name: string;
  cueCount: number;
  cards: number;
};

const actions = [
  { label: '+ New Topic', route: '/add-flashcards', tone: 'primary' },
  { label: '📄 Import Document', route: '/import-document', tone: 'accent' },
  { label: 'Sleep Mode', route: '/sleep-mode', tone: 'success' },
  { label: 'Morning Quiz', route: '/morning-quiz', tone: 'accent' },
  { label: 'Dashboard', route: '/dashboard', tone: 'primary' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const mutedText = useThemeColor({}, 'textSecondary');
  const [topics] = useState<Topic[]>([
    { id: '1', name: 'Photosynthesis', cards: 18, cueCount: 54 },
    { id: '2', name: 'Spanish Basics', cards: 25, cueCount: 40 },
    { id: '3', name: 'AWS Study', cards: 12, cueCount: 30 },
  ]);

  const renderTopic: ListRenderItem<Topic> = ({ item }) => (
    <TopicCard
      title={item.name}
      subtitle={`${item.cards} cards • ${item.cueCount} cues`}
      onPress={() => router.push({ pathname: '/add-flashcards', params: { topicId: item.id } })}
    />
  );

  const emptyState = useMemo(
    () => (
      <ThemedText style={[styles.emptyText, { color: mutedText }]}>
        No topics yet. Tap + New Topic to begin!
      </ThemedText>
    ),
    [mutedText]
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">Dreamscape 🌙</ThemedText>
          <ThemedText style={[styles.tagline, { color: mutedText }]}>
            Nightly microlearning, tailored to you.
          </ThemedText>
        </View>

        <View style={styles.actionsWrapper}>
          {actions.map((action) => (
            <ActionButton key={action.label} label={action.label} tone={action.tone} onPress={() => router.push(action.route)} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Topics</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: mutedText }]}>
            Tap a topic to add flashcards or cues.
          </ThemedText>
        </View>

        <FlatList
          data={topics}
          keyExtractor={(item) => item.id}
          renderItem={renderTopic}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={emptyState}
          contentContainerStyle={topics.length === 0 ? styles.emptyWrapper : undefined}
        />
      </ScrollView>
    </ThemedView>
  );
}

type ActionTone = 'primary' | 'accent' | 'success';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone: ActionTone;
};

const ActionButton = ({ label, onPress, tone }: ActionButtonProps) => {
  const palette = {
    primary: useThemeColor({}, 'primary'),
    accent: useThemeColor({}, 'accent'),
    success: useThemeColor({}, 'success'),
  } as const;

  return (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: palette[tone] }]} onPress={onPress}>
      <ThemedText type="defaultSemiBold" style={styles.actionText}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

type TopicCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

const TopicCard = ({ title, subtitle, onPress }: TopicCardProps) => {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');

  return (
    <TouchableOpacity
      style={[styles.topicCard, { backgroundColor: cardColor, borderColor }]}
      onPress={onPress}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText style={[styles.topicMeta, { color: muted }]}>{subtitle}</ThemedText>
    </TouchableOpacity>
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
    gap: 8,
  },
  tagline: {
    fontSize: 16,
  },
  actionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: '47%',
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionHint: {
    fontSize: 14,
  },
  topicCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  topicMeta: {
    marginTop: 8,
  },
  separator: {
    height: 12,
  },
  emptyWrapper: {
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
