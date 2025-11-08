import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

type Topic = {
  id: string;
  name: string;
  cueCount: number;
  cards: number;
};

const LOGO_MARK = require('@/assets/images/logo-no-letters.png');

const actions = [
  {
    label: 'Flashcards',
    description: 'Edit cues & answers',
    route: '/add-flashcards',
    color: '#2a2f3a',
  },
  {
    label: 'Import Document',
    description: 'Summarize PDFs or text',
    route: '/import-document',
    color: '#2a2f3a',
  },
  {
    label: 'Morning Quiz',
    description: 'Reinforce what stuck',
    route: '/morning-quiz',
    color: '#2a2f3a',
  },
  {
    label: 'Dashboard',
    description: 'Review cue stats',
    route: '/dashboard',
    color: '#2a2f3a',
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const mutedText = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const highlightBackground = useThemeColor({ light: '#f0f4ff', dark: '#1b1f2a' }, 'card');
  const highlightBorder = useThemeColor({ light: '#dbeafe', dark: '#2a3246' }, 'border');
  const highlightCopy = useThemeColor({ light: '#475569', dark: '#cbd5e1' }, 'textSecondary');
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
      <ThemedText style={[Typography.caption, styles.emptyText, { color: mutedText }]}>
        No topics yet. Tap + New Topic to begin!
      </ThemedText>
    ),
    [mutedText]
  );

  const actionsPerRow = 2;
  const actionRows = useMemo(() => {
    const rows: typeof actions[] = [];
    for (let i = 0; i < actions.length; i += actionsPerRow) {
      rows.push(actions.slice(i, i + actionsPerRow));
    }
    return rows;
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />
            <ThemedText type="title">DreamScape</ThemedText>
          </View>
          <ThemedText style={[Typography.body, { color: mutedText }]}>
            Nightly microlearning, tailored to you.
          </ThemedText>
        </View>

        <View style={styles.actionsWrapper}>
          {actionRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.actionsRow}>
              {row.map((action) => (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  description={action.description}
                  color={action.color}
                  onPress={() => router.push(action.route)}
                />
              ))}
              {row.length < actionsPerRow &&
                Array.from({ length: actionsPerRow - row.length }).map((_, idx) => (
                  <View key={`spacer-${rowIndex}-${idx}`} style={[styles.actionButton, styles.actionSpacer]} />
                ))}
            </View>
          ))}
        </View>

        <View
          style={[styles.highlightCard, { backgroundColor: highlightBackground, borderColor: highlightBorder }]}
        >
          <ThemedText type="subtitle">Evening Flow</ThemedText>
          <ThemedText style={[Typography.body, { color: highlightCopy }]}>
            Add fresh flashcards, let Sleep Mode whisper cues while you rest, then review the
            dashboard to see what stuck.
          </ThemedText>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Topics</ThemedText>
          <ThemedText style={[Typography.caption, { color: mutedText }]}>
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
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  description: string;
  color: string;
  onPress: () => void;
};

const ActionButton = ({ label, description, color, onPress }: ActionButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color, shadowColor: color }]}
      activeOpacity={0.88}
      onPress={onPress}>
      <ThemedText type="defaultSemiBold" style={[Typography.bodySemi, styles.actionTitle]}>
        {label}
      </ThemedText>
      <ThemedText style={[Typography.caption, styles.actionDescription]}>{description}</ThemedText>
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
      <ThemedText style={[Typography.caption, styles.topicMeta, { color: muted }]}>
        {subtitle}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 48,
    height: 48,
  },
  actionsWrapper: {
    gap: 12,
    flexDirection: 'column',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 120,
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  actionSpacer: {
    opacity: 0,
  },
  actionTitle: {
    color: '#ffffff',
  },
  actionDescription: {
    color: 'rgba(255,255,255,0.85)',
  },
  sectionHeader: {
    gap: 4,
  },
  highlightCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
    borderWidth: 1,
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
  },
});
