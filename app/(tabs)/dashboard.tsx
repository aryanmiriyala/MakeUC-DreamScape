import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { cardSurface } from '@/constants/shadow';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

const sessionHistory = [
  { id: '1', date: 'Mon', cueCount: 42 },
  { id: '2', date: 'Tue', cueCount: 38 },
  { id: '3', date: 'Wed', cueCount: 50 },
  { id: '4', date: 'Thu', cueCount: 47 },
  { id: '5', date: 'Fri', cueCount: 62 },
];

export default function DashboardScreen() {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const backgroundColor = useThemeColor({}, 'background');

  const totalCues = sessionHistory.reduce((sum, session) => sum + session.cueCount, 0);
  const averageBoost = 14;
  const maxCueCount = Math.max(...sessionHistory.map((s) => s.cueCount));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeading
          title="Dashboard"
          subtitle="Track cues, retention, and recent sessions."
          spacing={24}
        />

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, cardSurface(cardColor)]}>
            <ThemedText style={[Typography.caption, styles.metricLabel]}>
              Total Cues Played
            </ThemedText>
            <ThemedText type="title">{totalCues}</ThemedText>
          </View>
          <View style={[styles.metricCard, cardSurface(cardColor)]}>
            <ThemedText style={[Typography.caption, styles.metricLabel]}>
              Avg Retention Boost
            </ThemedText>
            <ThemedText type="title">+{averageBoost}%</ThemedText>
          </View>
        </View>

        <View style={[styles.card, cardSurface(cardColor)]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Recent Sessions</ThemedText>
            <ThemedText style={[Typography.caption, { color: muted }]}>Last 5 nights</ThemedText>
          </View>
          <View style={styles.chartRow}>
            {sessionHistory.map((session) => (
              <View key={session.id} style={styles.chartColumn}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(session.cueCount / maxCueCount) * 100}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
                <ThemedText style={[Typography.micro, styles.chartLabel, { color: muted }]}>
                  {session.date}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, cardSurface(cardColor)]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Session History</ThemedText>
            <ThemedText style={[Typography.caption, { color: muted }]}>
              Chronological log
            </ThemedText>
          </View>
          {sessionHistory.map((session, idx) => (
            <View
              key={session.id}
              style={[
                styles.historyRow,
                { borderBottomColor: idx === sessionHistory.length - 1 ? 'transparent' : borderColor },
              ]}>
              <View>
                <ThemedText type="defaultSemiBold">{session.cueCount} cues</ThemedText>
                <ThemedText style={[Typography.caption, { color: muted }]}>
                  {session.date}
                </ThemedText>
              </View>
              <ThemedText style={[Typography.caption, { color: muted }]}>
                🌀 {Math.round(session.cueCount / 5)} items
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
  },
  metricLabel: {
    marginBottom: 8,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    gap: 16,
    marginHorizontal: 6,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    height: 140,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: 18,
    borderRadius: 9,
  },
  chartLabel: {
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
