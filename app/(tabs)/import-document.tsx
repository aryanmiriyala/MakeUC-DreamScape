import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

type FileMeta = {
  name: string;
  uri: string;
  mimeType: 'application/pdf' | 'text/plain';
  size?: number | null;
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
  const backgroundColor = useThemeColor({}, 'background');

  const [selectedFile, setSelectedFile] = useState<FileMeta | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const pickDocument = async () => {
    setPickerError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      const canceled = 'canceled' in result ? result.canceled : result.type === 'cancel';
      if (canceled) {
        return;
      }

      const asset =
        'assets' in result
          ? result.assets?.[0]
          : ({
              uri: result.uri,
              name: result.name,
              size: result.size,
              mimeType: result.mimeType,
            } as DocumentPicker.DocumentPickerAsset);

      if (!asset) {
        setPickerError('Unable to read selected file.');
        return;
      }

      const inferredMime =
        (asset.mimeType as FileMeta['mimeType'] | undefined) ??
        (asset.name?.toLowerCase().endsWith('.txt') ? 'text/plain' : 'application/pdf');

      if (inferredMime !== 'application/pdf' && inferredMime !== 'text/plain') {
        setPickerError('Please select a PDF or TXT file.');
        return;
      }

      setSelectedFile({
        name: asset.name ?? 'Untitled document',
        uri: asset.uri,
        mimeType: inferredMime,
        size: asset.size,
      });
      setCues([]);
    } catch (error) {
      console.error('Document picker error', error);
      setPickerError('Unable to open file. Please try again.');
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Import Document</ThemedText>
          <ThemedText style={[Typography.caption, { color: muted }]}>
            Upload PDFs or TXT files for Gemini to summarize.
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">1. Upload file</ThemedText>
          {selectedFile ? (
            <View style={styles.fileRow}>
              <ThemedText style={Typography.body}>{selectedFile.name}</ThemedText>
              <ThemedText style={[Typography.caption, { color: muted }]}>
                {selectedFile.mimeType === 'application/pdf' ? 'PDF' : 'TXT'}
                {selectedFile.size ? ` • ${(selectedFile.size / 1024).toFixed(0)} KB` : ''}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={[Typography.caption, { color: muted }]}>
              No file selected yet.
            </ThemedText>
          )}

          <TouchableOpacity style={[styles.outlineButton, { borderColor }]} onPress={pickDocument}>
            <ThemedText type="defaultSemiBold">📄 Choose Document</ThemedText>
          </TouchableOpacity>
          {pickerError && (
            <ThemedText style={[Typography.caption, styles.errorText, { color: accent }]}>
              {pickerError}
            </ThemedText>
          )}
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
            <ThemedText type="defaultSemiBold" style={[Typography.bodySemi, styles.primaryText]}>
              ✨ Generate Cues (Gemini)
            </ThemedText>
          </TouchableOpacity>

          {isGenerating && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={accent} />
              <ThemedText style={[Typography.caption, { color: muted }]}>
                Summarizing with Gemini…
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText type="defaultSemiBold">3. Review cues</ThemedText>
          {cues.length === 0 ? (
            <ThemedText style={[Typography.caption, { color: muted }]}>
              Gemini cues will appear here (≤5 words each).
            </ThemedText>
          ) : (
            cues.map((cue) => (
              <View key={cue.id} style={[styles.cueCard, { borderColor }]}>
                <ThemedText type="defaultSemiBold">“{cue.cue}”</ThemedText>
                <ThemedText style={[Typography.caption, { color: muted }]}>
                  {cue.snippet}
                </ThemedText>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: primary, opacity: cues.length ? 1 : 0.4 },
            ]}
            disabled={cues.length === 0}>
            <ThemedText type="defaultSemiBold" style={[Typography.bodySemi, styles.primaryText]}>
              💾 Save to Topic
            </ThemedText>
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
    gap: 20,
  },
  header: {
    gap: 4,
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
  cueCard: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  errorText: {
    marginTop: 8,
  },
});
