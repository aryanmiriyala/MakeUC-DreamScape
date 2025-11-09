import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeading } from '@/components/page-heading';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { cardSurface } from '@/constants/shadow';
import { Typography } from '@/constants/typography';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateTopicHeader, summarizeDocumentWithGemini } from '@/lib/gemini';
import { generateId, putDocument } from '@/lib/storage';
import { useTopicStore } from '@/store/topicStore';

const SUPPORTED_MIME_TYPES = ['application/pdf', 'text/plain'] as const;
const PICKER_MIME_TYPES: string[] = [...SUPPORTED_MIME_TYPES];

type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

type FileMeta = {
  name: string;
  uri: string;
  mimeType: SupportedMimeType;
  size?: number | null;
  uploaded?: boolean;
};

type Cue = {
  id: string;
  cue: string;
  snippet: string;
};

export default function ImportDocumentScreen() {
  useStoreInitializer(useTopicStore);

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);

  const addTopic = useTopicStore((state) => state.addTopic);
  const addItem = useTopicStore((state) => state.addItem);
  const addCue = useTopicStore((state) => state.addCue);

  useFocusEffect(
    useCallback(() => {
      setSelectedFile(null);
      setCues([]);
      setPickerError(null);
      setStatusMessage(null);
      setGeminiError(null);
      setTopicStatus(null);
      setIsPicking(false);
      setIsUploading(false);
      setIsGenerating(false);
      setIsSavingTopic(false);
    }, [])
  );

  const pickDocument = async () => {
    setPickerError(null);
    setStatusMessage(null);
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: PICKER_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset) {
        setPickerError('Unable to read selected file.');
        return;
      }

      const inferredMime =
        (asset.mimeType as SupportedMimeType | undefined) ?? inferMimeFromName(asset.name);

      if (!inferredMime || !SUPPORTED_MIME_TYPES.includes(inferredMime)) {
        setPickerError('Please select a PDF or TXT file.');
        return;
      }

      setSelectedFile({
        name: asset.name ?? 'Untitled document',
        uri: asset.uri,
        mimeType: inferredMime,
        size: asset.size,
        uploaded: false,
      });
      setCues([]);
      setGeminiError(null);
    } catch (error) {
      console.error('Document picker error', error);
      setPickerError('Unable to open file. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) return;

    setPickerError(null);
    setStatusMessage(null);
    setIsUploading(true);

    try {
      const id = generateId('doc');
      const extension = resolveExtension(selectedFile);
      const storageRoot = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      let destination = selectedFile.uri;
      let storedInAppSandbox = false;

      if (storageRoot) {
        const targetDir = `${storageRoot}documents/`;
        await ensureDirectory(targetDir);
        destination = `${targetDir}${id}${extension}`;
        await FileSystem.copyAsync({ from: selectedFile.uri, to: destination });
        storedInAppSandbox = true;
      }

      await putDocument({
        id,
        originalName: selectedFile.name,
        mimeType: selectedFile.mimeType,
        size: selectedFile.size ?? undefined,
        localUri: destination,
        uploadedAt: new Date().toISOString(),
      });

      setSelectedFile((prev) =>
        prev
          ? {
              ...prev,
              uri: destination,
              uploaded: true,
            }
          : prev
      );
      setStatusMessage('Document uploaded successfully.');
    } catch (error) {
      console.error('Document upload failed', error);
      setPickerError('Unable to upload the document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateCues = async () => {
    if (!selectedFile?.uploaded) return;
    setGeminiError(null);
    setIsGenerating(true);

    try {
      const cuesFromGemini = await summarizeDocumentWithGemini({
        uri: selectedFile.uri,
        mimeType: selectedFile.mimeType,
        originalName: selectedFile.name,
      });

      if (!cuesFromGemini.length) {
        setGeminiError('Gemini returned an empty response. Try a smaller section of the document.');
        setCues([]);
      } else {
        setCues(cuesFromGemini);
      }
    } catch (error) {
      console.error('Gemini summarization failed', error);
      setGeminiError(
        error instanceof Error ? error.message : 'Unable to summarize document with Gemini.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

const hasSelection = Boolean(selectedFile);
const hasUploaded = Boolean(selectedFile?.uploaded);
const shouldUpload = hasSelection && !hasUploaded;
const primaryAction = shouldUpload ? uploadDocument : pickDocument;
const primaryLabel = shouldUpload ? '⬆️ Upload Document' : '📄 Choose Document';
const primaryBusy = (!hasSelection && isPicking) || (shouldUpload && isUploading);
  const saveDisabled = cues.length === 0 || isSavingTopic;

  const derivedTopicName = useMemo(() => {
    if (!selectedFile) return '';
    return truncateFileName(selectedFile.name, 32);
  }, [selectedFile]);

  const saveTopicWithCues = async () => {
    if (!selectedFile?.uploaded || cues.length === 0) return;
    setIsSavingTopic(true);
    setTopicStatus(null);
    try {
      const topicName = derivedTopicName || 'Imported Topic';
      const topicDescription = `Imported from ${selectedFile.name}`;
      let shortHeader = topicName.slice(0, 20);

      try {
        shortHeader = await generateTopicHeader({
          topicName,
          description: topicDescription,
          maxLength: 20,
        });
      } catch (error) {
        console.warn('generateTopicHeader failed, falling back to truncated name', error);
      }

      const topic = await addTopic({
        name: topicName,
        description: topicDescription,
        shortName: shortHeader,
      });

      // Create items and their associated cues
      for (let index = 0; index < cues.length; index++) {
        const cue = cues[index];
        const cueText = cue.cue || `Cue ${index + 1}`;
        
        // Create the item
        const item = await addItem(topic.id, {
          front: cueText,
          back: cue.snippet || cueText || 'Generated cue',
          cueText: cueText, // Keep cueText on item for backwards compatibility
        });

        // Create the actual Cue object (this is what Sleep Mode needs!)
        await addCue(item.id, cueText);
      }

      setTopicStatus(`Topic saved with ${cues.length} flashcards and cues! Check Sleep Mode.`);
    } catch (error) {
      console.error('Failed to save topic', error);
      setTopicStatus(
        error instanceof Error ? error.message : 'Unable to save topic. Please try again.'
      );
    } finally {
      setIsSavingTopic(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeading
          title="Import Document"
          subtitle="Upload PDF or TXT files for Gemini to summarize."
          spacing={24}
        />

        <View style={[styles.card, cardSurface(cardColor)]}>
          <ThemedText type="defaultSemiBold">1. Upload file</ThemedText>
          {selectedFile ? (
            <View style={styles.fileRow}>
              <View>
                <ThemedText style={Typography.body}>{truncateFileName(selectedFile.name)}</ThemedText>
                <ThemedText style={[Typography.caption, { color: muted }]}>
                  {fileBadge(selectedFile.mimeType)}
                </ThemedText>
              </View>
                <TouchableOpacity
                  accessibilityLabel="Remove document"
                  onPress={() => {
                    setSelectedFile(null);
                    setCues([]);
                    setStatusMessage(null);
                    setGeminiError(null);
                  }}
                >
                <ThemedText style={[Typography.bodySemi, styles.removeIcon]}>✖️</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <ThemedText style={[Typography.caption, { color: muted }]}>
              No file selected yet.
            </ThemedText>
          )}

          <AppButton
            label={primaryBusy ? '⏳ Working…' : primaryLabel}
            onPress={primaryAction}
            loading={primaryBusy}
            disabled={primaryBusy}
          />
          {pickerError && (
            <ThemedText style={[Typography.caption, styles.errorText, { color: accent }]}>
              {pickerError}
            </ThemedText>
          )}
          {statusMessage && (
            <ThemedText style={[Typography.caption, styles.successText, { color: primary }]}>
              {statusMessage}
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, cardSurface(cardColor)]}>
          <ThemedText type="defaultSemiBold">2. Generate cues (Gemini)</ThemedText>
          <AppButton
            label="✨ Generate Cues (Gemini)"
            onPress={generateCues}
            loading={isGenerating}
            disabled={!hasUploaded}
          />

          {isGenerating && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={accent} />
              <ThemedText style={[Typography.caption, { color: muted }]}>
                Summarizing with Gemini…
              </ThemedText>
            </View>
          )}
          {geminiError && (
            <ThemedText style={[Typography.caption, styles.errorText, { color: accent }]}>
              {geminiError}
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, cardSurface(cardColor)]}>
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

          <AppButton
            label={isSavingTopic ? 'Saving…' : '💾 Save to Topic'}
            onPress={saveTopicWithCues}
            loading={isSavingTopic}
            disabled={saveDisabled}
          />
          {topicStatus && (
            <ThemedText style={[Typography.caption, styles.successText, { color: primary }]}>
              {topicStatus}
            </ThemedText>
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
    overflow: 'visible',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    marginHorizontal: 8,
    marginTop: 8,
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  successText: {
    marginTop: 8,
  },
  removeIcon: {
    fontSize: 18,
  },
});

function truncateFileName(name: string, maxLength = 15): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, maxLength)}…`;
}

function fileBadge(mime: SupportedMimeType): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'text/plain') return 'TXT';
  return 'File';
}

function inferMimeFromName(name?: string): SupportedMimeType | undefined {
  if (!name) return undefined;
  const lowered = name.toLowerCase();
  if (lowered.endsWith('.pdf')) return 'application/pdf';
  if (lowered.endsWith('.txt')) return 'text/plain';
  return undefined;
}

async function ensureDirectory(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && info.isDirectory) {
    return;
  }
  await FileSystem.makeDirectoryAsync(path, { intermediates: true });
}

function resolveExtension(file: FileMeta): string {
  const mimeToExtension: Record<SupportedMimeType, string> = {
    'application/pdf': '.pdf',
    'text/plain': '.txt',
  };

  if (mimeToExtension[file.mimeType]) {
    return mimeToExtension[file.mimeType];
  }

  const dot = file.name.lastIndexOf('.');
  if (dot !== -1) {
    return file.name.slice(dot);
  }

  return '.bin';
}
