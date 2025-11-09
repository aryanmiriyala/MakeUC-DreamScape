import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/typography';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTopicStore } from '@/store/topicStore';

const LOGO_MARK = require('@/assets/images/logo-no-letters-removebg-preview.png');

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
  
  // Hero card theme colors
  const heroCardBg = useThemeColor({ light: '#f8fafc', dark: '#0f172a' }, 'card');
  const heroBodyText = useThemeColor({ light: '#475569', dark: '#dbeafe' }, 'text');

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

        <View style={[styles.heroCard, { backgroundColor: heroCardBg }]}>
          <View style={styles.heroHeader}>
            <ThemedText type="subtitle">Tonight's ritual</ThemedText>
            <View style={styles.heroPill}>
              <IconSymbol name="sparkles" size={16} color="#0f1115" />
              
            </View>
          </View>
          <ThemedText style={[styles.heroBody, { color: heroBodyText }]}>
            Import cues, let Sleep Mode whisper while you rest, then crush the morning quiz.
          </ThemedText>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroPrimary} onPress={() => router.push('/sleep-mode')}>
              <IconSymbol name="moon.zzz.fill" size={20} color="#0f1115" />
              <ThemedText type="defaultSemiBold" style={styles.heroPrimaryText}>
                Start Sleep Mode
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroSecondary} onPress={() => router.push('/import-document')}>
              <IconSymbol name="doc.text.fill" size={18} color="#a5b4fc" />
              <ThemedText type="defaultSemiBold" style={styles.heroSecondaryText}>
                Import
              </ThemedText>
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
  const cardColor = useThemeColor({ light: '#f8fafc', dark: '#111827' }, 'card');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: 'rgba(255,255,255,0.08)' }, 'border');
  const labelColor = useThemeColor({ light: '#64748b', dark: '#c7d2fe' }, 'textSecondary');
  const captionColor = useThemeColor({ light: '#94a3b8', dark: '#94a3b8' }, 'textSecondary');

  return (
    <View style={[styles.insightCard, { backgroundColor: cardColor, borderColor }]}>
      <ThemedText style={[styles.insightLabel, { color: labelColor }]}>{label}</ThemedText>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText style={[styles.insightCaption, { color: captionColor }]}>{caption}</ThemedText>
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
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
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
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a5b4fc',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  heroPrimaryText: {
    color: '#0f1115',
    fontSize: 15,
  },
  heroSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(165, 180, 252, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.3)',
  },
  heroSecondaryText: {
    color: '#a5b4fc',
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 2,
  },
  insightLabel: {
    fontSize: 13,
  },
  insightCaption: {
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
