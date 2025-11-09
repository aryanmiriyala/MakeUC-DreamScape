import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { cardSurface } from '@/constants/shadow';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useTopicStore } from '@/store/topicStore';

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

type ActionDefinition = (typeof actions)[number];

export default function HomeScreen() {
  useStoreInitializer(useTopicStore);

  const router = useRouter();
  const mutedText = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const highlightBackground = useThemeColor({ light: '#f0f4ff', dark: '#1b1f2a' }, 'card');
  const highlightBorder = useThemeColor({ light: '#dbeafe', dark: '#2a3246' }, 'border');
  const highlightCopy = useThemeColor({ light: '#475569', dark: '#cbd5e1' }, 'textSecondary');

  const actionsPerRow = 2;
  const actionRows = useMemo<ActionDefinition[][]>(() => {
    const rows: ActionDefinition[][] = [];
    for (let i = 0; i < actions.length; i += actionsPerRow) {
      rows.push(actions.slice(i, i + actionsPerRow));
    }
    return rows;
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeading
          title="DreamScape"
          subtitle="Nightly microlearning, tailored to you."
          leadingSlot={<Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />}
          spacing={24}
        />

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
          style={[styles.highlightCard, cardSurface(highlightBackground), { borderColor: highlightBorder }]}
        >
          <ThemedText type="subtitle">Evening Flow</ThemedText>
          <ThemedText style={[Typography.body, { color: highlightCopy }]}>
            Add fresh flashcards, let Sleep Mode whisper cues while you rest, then review the
            dashboard to see what stuck.
          </ThemedText>
        </View>

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
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
  highlightCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
    borderWidth: 1,
    marginHorizontal: 4,
  },
});
