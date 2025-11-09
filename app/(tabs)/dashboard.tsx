import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { cardSurface } from '@/constants/shadow';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useSleepStore } from '@/store/sleepStore';

export default function DashboardScreen() {
  useStoreInitializer(useSleepStore);

  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const backgroundColor = useThemeColor({}, 'background');

  const sessions = useSleepStore((state) => state.sessions);
  const cueEvents = useSleepStore((state) => state.cueEvents);
  const loading = useSleepStore((state) => state.loading);

  const sessionList = Object.values(sessions).sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const playedCueEvents = cueEvents.filter((event) => event.status === 'played');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastFiveDays = Array.from({ length: 5 }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (4 - idx));
    return date;
  });

  const dayKeyFromDate = (date: Date) => date.toISOString().slice(0, 10);
  const dayKeyFromIso = (iso: string) => dayKeyFromDate(new Date(iso));

  const cueEventsByDay = playedCueEvents.reduce<Record<string, number>>((acc, event) => {
    const key = dayKeyFromIso(event.timestamp);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const recentBars = lastFiveDays.map((date) => {
    const key = dayKeyFromDate(date);
    const cueCount = cueEventsByDay[key] ?? 0;
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      cueCount,
    };
  });

  const maxCueCount = Math.max(1, ...recentBars.map((bar) => bar.cueCount));
  const totalCues = cueEvents.filter((event) => event.status === 'played').length;
  const averageBoost = sessionList.length
    ? Math.round(
        (sessionList.reduce((sum, session) => {
          const planned = session.plannedCueIds.length || 1;
          return sum + session.cueIdsPlayed.length / planned;
        }, 0) /
          sessionList.length) *
          100
      )
    : 0;

  const formatLongDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const historySessions = sessionList.filter((session) => session.cueIdsPlayed.length > 0);

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
            <ThemedText type="title">
              {sessionList.length ? `+${averageBoost}%` : '—'}
            </ThemedText>
          </View>
        </View>
        {loading ? (
          <ThemedText style={{ color: muted }}>Syncing recent sessions…</ThemedText>
        ) : null}

        <View style={[styles.card, cardSurface(cardColor)]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Recent Sessions</ThemedText>
            <ThemedText style={[Typography.caption, { color: muted }]}>Last 5 nights</ThemedText>
          </View>
          <View style={styles.chartRow}>
            {recentBars.map((bar) => {
              const ratio = bar.cueCount / maxCueCount;
              const heightPercent = Math.max(ratio || 0, 0.12);
              return (
                <View key={bar.key} style={styles.chartColumn}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${heightPercent * 100}%`,
                        backgroundColor: accent,
                      },
                    ]}
                  />
                  <ThemedText style={[Typography.micro, styles.chartLabel, { color: muted }]}>
                    {bar.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, cardSurface(cardColor)]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Session History</ThemedText>
            <ThemedText style={[Typography.caption, { color: muted }]}>Chronological log</ThemedText>
          </View>
          {historySessions.length === 0 ? (
            <ThemedText style={{ color: muted }}>Run a Sleep session to populate history.</ThemedText>
          ) : (
            historySessions.slice(0, 10).map((session, idx, arr) => (
              <View
                key={session.id}
                style={[
                  styles.historyRow,
                  { borderBottomColor: idx === arr.length - 1 ? 'transparent' : borderColor },
                ]}>
                <View>
                  <ThemedText type="defaultSemiBold">{session.cueIdsPlayed.length} cues</ThemedText>
                  <ThemedText style={[Typography.caption, { color: muted }]}>
                    {formatLongDate(session.startedAt)}
                  </ThemedText>
                </View>
                <View style={styles.historyMeta}>
                  <ThemedText style={[Typography.caption, { color: muted }]}>planned {session.plannedCueIds.length}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: muted }]}>interruptions {session.interruptions ?? 0}</ThemedText>
                </View>
              </View>
            ))
          )}
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
    height: 90,
    paddingTop: 4,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  chartLabel: {
    textAlign: 'center',
    marginTop: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
