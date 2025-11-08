import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
};

const questions: Question[] = [
  {
    id: '1',
    prompt: 'Why do we keep cues ultra-short during Sleep Mode?',
    options: [
      'To avoid waking the user',
      'To save storage',
      'To train translation models',
      'To reduce CPU load',
    ],
    answer: 'To avoid waking the user',
  },
  {
    id: '2',
    prompt: 'What powers cue generation from PDFs?',
    options: ['Gemini API', 'RSS feeds', 'Local CSVs', 'Manual typing only'],
    answer: 'Gemini API',
  },
  {
    id: '3',
    prompt: 'Which screen shows “Estimated Retention Boost”?',
    options: ['Home', 'Import Document', 'Morning Quiz', 'Dashboard'],
    answer: 'Morning Quiz',
  },
];

export default function MorningQuizScreen() {
  const router = useRouter();
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const accent = useThemeColor({}, 'accent');

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);

  const current = questions[index];
  const progressLabel = `Question ${index + 1} of ${questions.length}`;

  const onSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === current.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const onNext = () => {
    if (!answered) return;
    if (index === questions.length - 1) {
      setComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
  };

  const resetQuiz = () => {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setComplete(false);
  };

  const retentionBoost = useMemo(() => Math.round((score / questions.length) * 25) || 8, [score]);

  if (complete) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.resultCard}>
          <ThemedText type="subtitle">Great job!</ThemedText>
          <ThemedText style={{ color: muted }}>
            You answered {score} / {questions.length} questions.
          </ThemedText>
          <View style={[styles.boostBubble, { backgroundColor: accent }]}>
            <ThemedText style={styles.boostText}>Estimated Retention Boost: +{retentionBoost}%</ThemedText>
          </View>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: success }]} onPress={resetQuiz}>
              <ThemedText style={styles.buttonText}>Replay Quiz</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: cardColor, borderColor, borderWidth: 1 }]}
              onPress={() => router.push('/dashboard')}>
              <ThemedText type="defaultSemiBold">View Dashboard</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Morning Quiz</ThemedText>
          <ThemedText style={{ color: muted }}>{progressLabel}</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText style={styles.prompt}>{current.prompt}</ThemedText>

          {current.options.map((option) => {
            const isSelected = selected === option;
            const isCorrect = answered && option === current.answer;
            const isIncorrect = answered && isSelected && option !== current.answer;
            const backgroundColor = isCorrect
              ? success
              : isIncorrect
              ? danger
              : 'transparent';

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  {
                    borderColor,
                    backgroundColor,
                  },
                ]}
                onPress={() => onSelect(option)}>
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: isCorrect || isIncorrect ? '#0f1115' : undefined }}>
                  {option}
                </ThemedText>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: answered ? accent : '#4b5563', opacity: answered ? 1 : 0.6 },
            ]}
            disabled={!answered}
            onPress={onNext}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {index === questions.length - 1 ? 'Finish' : 'Next'}
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
    padding: 24,
  },
  content: {
    gap: 16,
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
  prompt: {
    fontSize: 18,
    marginBottom: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
  },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  boostBubble: {
    borderRadius: 18,
    padding: 16,
  },
  boostText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  resultButtons: {
    gap: 12,
  },
});
