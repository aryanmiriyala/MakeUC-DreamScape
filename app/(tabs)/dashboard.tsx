import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  const insets = useSafeAreaInsets();

  const totalCues = sessionHistory.reduce((sum, session) => sum + session.cueCount, 0);
  const averageBoost = 14;
  const maxCueCount = Math.max(...sessionHistory.map((s) => s.cueCount));

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <ThemedText type="subtitle">Dashboard</ThemedText>
        <ThemedText style={{ color: muted }}>Track cues, retention, and recent sessions.</ThemedText>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: cardColor, borderColor }]}>
            <ThemedText style={styles.metricLabel}>Total Cues Played</ThemedText>
            <ThemedText type="title">{totalCues}</ThemedText>
          </View>
          <View style={[styles.metricCard, { backgroundColor: cardColor, borderColor }]}>
            <ThemedText style={styles.metricLabel}>Avg Retention Boost</ThemedText>
            <ThemedText type="title">+{averageBoost}%</ThemedText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Recent Sessions</ThemedText>
            <ThemedText style={{ color: muted }}>Last 5 nights</ThemedText>
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
                <ThemedText style={[styles.chartLabel, { color: muted }]}>{session.date}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Session History</ThemedText>
            <ThemedText style={{ color: muted }}>Chronological log</ThemedText>
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
                <ThemedText style={{ color: muted }}>{session.date}</ThemedText>
              </View>
              <ThemedText style={{ color: muted }}>🌀 {Math.round(session.cueCount / 5)} items</ThemedText>
            </View>
          ))}
        </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  metricLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 16,
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
    fontSize: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
