import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    colors: { base: '#1b1930', halo: '#4c1d95' },
    icon: 'square.stack.3d.up.fill',
  },
  {
    label: 'Import Docs',
    description: 'Summarize PDFs or text',
    route: '/import-document',
    colors: { base: '#0f2139', halo: '#1d4ed8' },
    icon: 'doc.text.magnifyingglass',
  },
  {
    label: 'Morning Quiz',
    description: 'Reinforce what stuck',
    route: '/morning-quiz',
    colors: { base: '#10271c', halo: '#15803d' },
    icon: 'sun.max.fill',
  },
  {
    label: 'Dashboard',
    description: 'Review cue stats',
    route: '/dashboard',
    colors: { base: '#2b150c', halo: '#c2410c' },
    icon: 'chart.bar.xaxis',
  },
] as const;

type ActionDefinition = (typeof actions)[number];

export default function HomeScreen() {
  useStoreInitializer(useTopicStore);

  const router = useRouter();
  const topics = useTopicStore((state) => state.topics);
  const items = useTopicStore((state) => state.items);

  const backgroundColor = useThemeColor({}, 'background');
  const highlightBackground = useThemeColor({ light: '#f0f4ff', dark: '#1b1f2a' }, 'card');
  const highlightBorder = useThemeColor({ light: '#dbeafe', dark: '#2a3246' }, 'border');
  const highlightCopy = useThemeColor({ light: '#475569', dark: '#cbd5e1' }, 'textSecondary');

  const totalTopics = Object.keys(topics).length;
  const totalCards =
    Object.keys(items).length || Object.values(items).filter((item) => Boolean(item.cueText)).length;

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

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <ThemedText type="subtitle">Tonight’s ritual</ThemedText>
            <View style={styles.heroPill}>
              <IconSymbol name="sparkles" size={16} color="#0f1115" />
              
            </View>
          </View>
          <ThemedText style={styles.heroBody}>
            Import cues, let Sleep Mode whisper while you rest, then crush the morning quiz.
          </ThemedText>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroPrimary} onPress={() => router.push('/sleep-mode')}>
              <IconSymbol name="moon.zzz.fill" size={18} color="#0f1115" />
              <ThemedText type="defaultSemiBold" style={styles.heroPrimaryText}>
                Start Sleep Mode
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/import-document')}>
              <ThemedText type="link">Import document ↗</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <InsightCard label="Topics" value={totalTopics} caption="active decks" />
          <InsightCard label="Cards" value={totalCards} caption="saved flashcards" />
        </View>

        <View style={styles.actionsWrapper}>
          {actionRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.actionsRow}>
              {row.map((action) => (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  description={action.description}
                  colors={action.colors}
                  icon={action.icon}
                  onPress={() => router.push(action.route)}
                />
              ))}
            </View>
          ))}
        </View>

        
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  description: string;
  colors: {
    base: string;
    halo: string;
  };
  icon?: string;
  onPress: () => void;
};

const ActionButton = ({ label, description, colors, icon, onPress }: ActionButtonProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: colors.base,
          shadowColor: colors.base,
        },
      ]}
      activeOpacity={0.92}
      onPress={onPress}>
      <View style={[styles.actionHalo, { backgroundColor: colors.halo }]} />
      <View style={styles.actionTitleRow}>
        {icon ? (
          <View style={styles.actionIcon}>
            <IconSymbol name={icon} size={18} color="#f8fafc" />
          </View>
        ) : null}
        <ThemedText type="defaultSemiBold" style={[Typography.bodySemi, styles.actionTitle]}>
          {label}
        </ThemedText>
      </View>
      <ThemedText style={[Typography.caption, styles.actionDescription]}>{description}</ThemedText>
    </TouchableOpacity>
  );
};

type InsightCardProps = {
  label: string;
  value: number | string;
  caption: string;
};

const InsightCard = ({ label, value, caption }: InsightCardProps) => {
  return (
    <View style={styles.insightCard}>
      <ThemedText style={styles.insightLabel}>{label}</ThemedText>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText style={styles.insightCaption}>{caption}</ThemedText>
    </View>
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
  heroCard: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: '#0f172a',
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPill: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroPillText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  heroBody: {
    color: '#dbeafe',
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#a5b4fc',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  heroPrimaryText: {
    color: '#0f1115',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 2,
  },
  insightLabel: {
    color: '#c7d2fe',
    fontSize: 13,
  },
  insightCaption: {
    color: '#94a3b8',
    fontSize: 13,
  },
  actionsWrapper: {
    gap: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    minHeight: 120,
    justifyContent: 'space-between',
    gap: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  actionHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -40,
    opacity: 0.55,
  },
  actionTitle: {
    color: '#ffffff',
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionDescription: {
    color: 'rgba(255,255,255,0.85)',
  },
  highlightCard: {
    borderRadius: 22,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
  },
});
