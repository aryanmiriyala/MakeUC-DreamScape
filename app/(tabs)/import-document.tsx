import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type FileMeta = {
  name: string;
  type: 'pdf' | 'txt';
};

type Cue = {
  id: string;
  cue: string;
  snippet: string;
};

const mockCues: Cue[] = [
  { id: '1', cue: 'deep sleep', snippet: 'Deep sleep drives hormone regulation and memory.' },
  { id: '2', cue: 'cue spacing', snippet: 'Deliver new cues every 5–10 seconds.' },
  { id: '3', cue: 'soft audio', snippet: 'Keep TTS at whisper volume to avoid waking users.' },
];

export default function ImportDocumentScreen() {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const accent = useThemeColor({}, 'accent');
  const insets = useSafeAreaInsets();

  const [selectedFile, setSelectedFile] = useState<FileMeta | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const pickDocument = () => {
    setSelectedFile({ name: 'Sleep-Science-Notes.pdf', type: 'pdf' });
    setCues([]);
  };

  const generateCues = () => {
    if (!selectedFile) return;
    setIsGenerating(true);
    setTimeout(() => {
      setCues(mockCues);
      setIsGenerating(false);
    }, 1100);
  };

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Import Document</ThemedText>
          <ThemedText style={[styles.subline, { color: muted }]}>
            Upload PDFs or TXT files for Gemini to summarize.
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">1. Upload file</ThemedText>
          {selectedFile ? (
            <View style={styles.fileRow}>
              <ThemedText>{selectedFile.name}</ThemedText>
              <ThemedText style={{ color: muted }}>{selectedFile.type.toUpperCase()}</ThemedText>
            </View>
          ) : (
            <ThemedText style={{ color: muted }}>No file selected yet.</ThemedText>
          )}

          <TouchableOpacity style={[styles.outlineButton, { borderColor }]} onPress={pickDocument}>
            <ThemedText type="defaultSemiBold">📄 Choose Document</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">2. Generate cues (Gemini)</ThemedText>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: accent, opacity: selectedFile ? 1 : 0.4 },
            ]}
            disabled={!selectedFile || isGenerating}
            onPress={generateCues}>
            <ThemedText type="defaultSemiBold" style={styles.primaryText}>
              ✨ Generate Cues (Gemini)
            </ThemedText>
          </TouchableOpacity>

          {isGenerating && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={accent} />
              <ThemedText style={[styles.loadingText, { color: muted }]}>
                Summarizing with Gemini…
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">3. Review cues</ThemedText>
          {cues.length === 0 ? (
            <ThemedText style={{ color: muted }}>
              Gemini cues will appear here (≤5 words each).
            </ThemedText>
          ) : (
            cues.map((cue) => (
              <View key={cue.id} style={[styles.cueCard, { borderColor }]}>
                <ThemedText type="defaultSemiBold">“{cue.cue}”</ThemedText>
                <ThemedText style={{ color: muted }}>{cue.snippet}</ThemedText>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: primary, opacity: cues.length ? 1 : 0.4 },
            ]}
            disabled={cues.length === 0}>
            <ThemedText type="defaultSemiBold" style={styles.primaryText}>
              💾 Save to Topic
            </ThemedText>
          </TouchableOpacity>
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
  header: {
    gap: 4,
  },
  subline: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  cueCard: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
});
