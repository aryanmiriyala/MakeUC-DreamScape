import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { cardSurface } from '@/constants/shadow';
import { Typography } from '@/constants/typography';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useQuizStore } from '@/store/quizStore';
import { useSleepStore } from '@/store/sleepStore';
import { useTopicStore } from '@/store/topicStore';
export default function SettingsScreen() {
  useStoreInitializer(useTopicStore);
  useStoreInitializer(useSleepStore);
  useStoreInitializer(useQuizStore);

  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const backgroundColor = useThemeColor({}, 'background');

  // Get real data from stores - using Object.keys().length to ensure reactivity
  const sessionsCount = useSleepStore((state) => Object.keys(state.sessions).length);
  const completedSessionsCount = useSleepStore((state) => 
    Object.values(state.sessions).filter(s => s.status === 'completed').length
  );
  const topicsCount = useTopicStore((state) => Object.keys(state.topics).length);
  const itemsCount = useTopicStore((state) => Object.keys(state.items).length);
  const cuesCount = useTopicStore((state) => Object.keys(state.cues).length);
  const quizResultsCount = useQuizStore((state) => state.results.length);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      sleepSessions: completedSessionsCount,
      quizzesCompleted: quizResultsCount,
      flashcards: itemsCount,
      topics: topicsCount,
      cues: cuesCount,
    };
  }, [completedSessionsCount, quizResultsCount, itemsCount, topicsCount, cuesCount]);

  // User info state
  const [name, setName] = useState('Guest User');
  const [email, setEmail] = useState('user@example.com');
  const [isEditing, setIsEditing] = useState(false);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Get store methods for clearing data
  const clearTopicData = useTopicStore((state) => state.clearAll);
  const clearSleepHistory = useSleepStore((state) => state.clearHistory);
  const clearQuizData = useQuizStore((state) => state.clearResults);

  const handleSaveProfile = () => {
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will delete all your topics, flashcards, sleep sessions, and quiz history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                clearTopicData(),
                clearSleepHistory(),
                clearQuizData(),
              ]);
              Alert.alert('Success', 'All data has been cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
              console.error('Clear data error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeading
          title="Settings"
          subtitle="Manage your account and app preferences"
          spacing={24}
        />

        {/* User Profile Section */}
        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">👤 User Profile</ThemedText>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color={primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[Typography.caption, { color: muted }]}>Name</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor, borderColor, color: primary },
              ]}
              value={name}
              onChangeText={setName}
              editable={isEditing}
              placeholder="Enter your name"
              placeholderTextColor={muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[Typography.caption, { color: muted }]}>Email</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor, borderColor, color: primary },
              ]}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              placeholder="Enter your email"
              placeholderTextColor={muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {isEditing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: success }]}
                onPress={handleSaveProfile}>
                <ThemedText style={styles.buttonText}>Save</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: cardColor, borderColor, borderWidth: 1 }]}
                onPress={() => setIsEditing(false)}>
                <ThemedText type="defaultSemiBold">Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Statistics */}
        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            📊 Your Statistics
          </ThemedText>
          
          <View style={styles.statRow}>
            <ThemedText style={{ color: muted }}>Sleep Sessions Completed</ThemedText>
            <ThemedText type="defaultSemiBold">{stats.sleepSessions}</ThemedText>
          </View>
          
          <View style={styles.statRow}>
            <ThemedText style={{ color: muted }}>Quizzes Completed</ThemedText>
            <ThemedText type="defaultSemiBold">{stats.quizzesCompleted}</ThemedText>
          </View>
          
          <View style={styles.statRow}>
            <ThemedText style={{ color: muted }}>Total Flashcards</ThemedText>
            <ThemedText type="defaultSemiBold">{stats.flashcards}</ThemedText>
          </View>
          
          <View style={styles.statRow}>
            <ThemedText style={{ color: muted }}>Total Cues</ThemedText>
            <ThemedText type="defaultSemiBold">{stats.cues}</ThemedText>
          </View>
          
          <View style={styles.statRow}>
            <ThemedText style={{ color: muted }}>Topics Created</ThemedText>
            <ThemedText type="defaultSemiBold">{stats.topics}</ThemedText>
          </View>
        </View>

        {/* App Preferences */}
        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            ⚙️ Preferences
          </ThemedText>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText>Notifications</ThemedText>
              <ThemedText style={[Typography.caption, { color: muted }]}>
                Get reminders for sleep sessions
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: borderColor, true: accent }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText>Sound Effects</ThemedText>
              <ThemedText style={[Typography.caption, { color: muted }]}>
                Play audio during interactions
              </ThemedText>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: borderColor, true: accent }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText>Dark Mode</ThemedText>
              <ThemedText style={[Typography.caption, { color: muted }]}>
                Use dark theme (Coming soon)
              </ThemedText>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: borderColor, true: accent }}
              disabled
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.card, cardSurface(cardColor), { borderColor }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            ℹ️ About
          </ThemedText>

          <View style={styles.aboutRow}>
            <ThemedText style={{ color: muted }}>Version</ThemedText>
            <ThemedText type="defaultSemiBold">1.0.0</ThemedText>
          </View>

          <View style={styles.aboutRow}>
            <ThemedText style={{ color: muted }}>Build</ThemedText>
            <ThemedText type="defaultSemiBold">2025.11.09</ThemedText>
          </View>

          <TouchableOpacity style={styles.linkButton}>
            <ThemedText style={{ color: accent }}>Privacy Policy</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton}>
            <ThemedText style={{ color: accent }}>Terms of Service</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton}>
            <ThemedText style={{ color: accent }}>Contact Support</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, cardSurface(cardColor), { borderColor: danger, borderWidth: 1 }]}>
          <ThemedText type="defaultSemiBold" style={{ color: danger, marginBottom: 12 }}>
            ⚠️ Danger Zone
          </ThemedText>

          <TouchableOpacity
            style={[styles.dangerButton, { backgroundColor: danger }]}
            onPress={handleClearData}>
            <ThemedText style={styles.buttonText}>Clear All Data</ThemedText>
          </TouchableOpacity>
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
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkButton: {
    paddingVertical: 8,
  },
  dangerButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
