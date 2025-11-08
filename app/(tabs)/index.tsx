import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

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
            <ActionButton
              key={action.label}
              label={action.label}
              tone={action.tone}
              onPress={() => router.push(action.route)}
            />
          ))}
        </View>

        <View style={[styles.missionCard, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="subtitle">Evening Routine</ThemedText>
          <ThemedText style={[styles.cardText, { color: mutedText }]}>
            1. Import docs or add flashcards{'\n'}2. Run Sleep Mode cues{'\n'}3. Take Morning
            Quiz{'\n'}4. Review progress on the Dashboard
          </ThemedText>
        </View>
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
  missionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardText: {
    marginTop: 8,
    lineHeight: 22,
  },
});
