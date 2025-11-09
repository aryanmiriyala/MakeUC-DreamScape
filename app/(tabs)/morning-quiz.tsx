import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { useStoreInitializer } from '@/hooks/use-store-initializer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateQuizFromCues, type QuizQuestion } from '@/lib/gemini';
import { useQuizStore } from '@/store/quizStore';
import { useSleepStore } from '@/store/sleepStore';
import { useTopicStore } from '@/store/topicStore';

type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
};

export default function MorningQuizScreen() {
  useStoreInitializer(useSleepStore);
  useStoreInitializer(useTopicStore);
  useStoreInitializer(useQuizStore);

  const router = useRouter();
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const accent = useThemeColor({}, 'accent');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const sessions = useSleepStore((state) => state.sessions);
  const cueEvents = useSleepStore((state) => state.cueEvents);
  const removeSession = useSleepStore((state) => state.removeSession);
  const items = useTopicStore((state) => state.items);
  const cues = useTopicStore((state) => state.cues);
  const topics = useTopicStore((state) => state.topics);
  const recordResult = useQuizStore((state) => state.recordResult);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(true);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  const onSelect = (option: string) => {
    const current = questions[index];
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    setUserAnswers((prev) => ({ ...prev, [index]: option }));
    if (option === current.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const onNext = async () => {
    if (!answered) return;
    if (index === questions.length - 1) {
      // Quiz completed - record the result
      const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null;
      const topicId = selectedSession?.topicId;
      
      if (topicId && quizStartTime) {
        const durationMs = Date.now() - quizStartTime;
        const totalQuestions = questions.length;
        const correctAnswers = score + (selected === questions[index].answer ? 1 : 0);
        const finalScore = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Record the final answer
        const finalAnswers = { ...userAnswers, [index]: selected || '' };
        
        try {
          await recordResult({
            topicId,
            sessionId: selectedSessionId || undefined,
            score: finalScore,
            items: questions.map((q, idx) => ({
              itemId: q.id,
              prompt: q.prompt,
              userAnswer: finalAnswers[idx] || '',
              correctAnswer: q.answer,
              correct: finalAnswers[idx] === q.answer,
            })),
            durationMs,
          });
          console.log('Quiz result recorded:', { topicId, score: finalScore, durationMs });
        } catch (error) {
          console.error('Failed to record quiz result:', error);
        }
      }
      
      setComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
  };

  // Get available completed sessions
  const availableSessions = useMemo(() => {
    const completedSessions = Object.values(sessions).filter((s) => s.status === 'completed');
    return completedSessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [sessions]);

  // Auto-select most recent session on mount
  useEffect(() => {
    if (!selectedSessionId && availableSessions.length > 0) {
      setSelectedSessionId(availableSessions[0].id);
    }
  }, [selectedSessionId, availableSessions]);

  // Get cues from selected session
  const recentCues = useMemo(() => {
    if (!selectedSessionId) {
      console.log('Morning Quiz: No session ID selected');
      return [];
    }
    
    const selectedSession = sessions[selectedSessionId];
    if (!selectedSession) {
      console.log('Morning Quiz: Session not found in store', {
        selectedSessionId,
        availableSessions: Object.keys(sessions),
      });
      return [];
    }
    
    if (selectedSession.status !== 'completed') {
      console.log('Morning Quiz: Session not completed', {
        status: selectedSession.status,
      });
      return [];
    }
    
    console.log('Morning Quiz: Selected session:', {
      id: selectedSession.id,
      topicId: selectedSession.topicId,
      cueIdsPlayed: selectedSession.cueIdsPlayed,
      status: selectedSession.status,
    });

    // Get items from that session - try multiple approaches
    const sessionCues: Array<{ cue: string; snippet: string }> = [];
    
    // First try: Use cueIdsPlayed if available
    if (selectedSession.cueIdsPlayed && selectedSession.cueIdsPlayed.length > 0) {
      selectedSession.cueIdsPlayed.forEach((cueId) => {
        const cue = cues[cueId];
        if (cue) {
          const item = items[cue.itemId];
          sessionCues.push({
            cue: cue.cueText || item?.front || 'Learning cue',
            snippet: item?.back || cue.cueText || 'Study material',
          });
        }
      });
    }
    
    // Fallback: If no cues found but we have a topicId, use all items from that topic
    if (sessionCues.length === 0 && selectedSession.topicId) {
      console.log('Morning Quiz: Falling back to all items from topic', {
        topicId: selectedSession.topicId,
        totalItems: Object.keys(items).length,
        totalTopics: Object.keys(topics).length,
      });
      const topicItems = Object.values(items).filter(
        (item) => item.topicId === selectedSession.topicId
      );
      
      console.log('Morning Quiz: Found topic items:', topicItems.length);
      
      topicItems.forEach((item) => {
        sessionCues.push({
          cue: item.front || item.cueText || 'Learning cue',
          snippet: item.back || 'Study material',
        });
      });
    }

    console.log('Morning Quiz: Found', sessionCues.length, 'cues');
    return sessionCues;
  }, [selectedSessionId, sessions, cues, items, topics]);

  const generateQuestions = useCallback(async () => {
    if (recentCues.length === 0) {
      setGenerationError('No cues found in selected session. Try a different session!');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const generatedQuestions = await generateQuizFromCues({
        cues: recentCues,
        numQuestions: 5,
      });

      if (generatedQuestions.length === 0) {
        throw new Error('Gemini could not generate questions from the cues');
      }

      setQuestions(generatedQuestions);
      setQuizStartTime(Date.now()); // Start timing when questions are generated
    } catch (error) {
      console.error('Quiz generation failed:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate quiz questions'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [recentCues]);

  // Generate questions on mount
  useEffect(() => {
    if (questions.length === 0 && !isGenerating && !generationError && shouldAutoGenerate) {
      void generateQuestions();
    }
  }, [questions.length, isGenerating, generationError, shouldAutoGenerate, generateQuestions]);

  const resetQuiz = () => {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setComplete(false);
    setUserAnswers({});
    setQuizStartTime(Date.now()); // Restart timer
  };

  const backToTopicSelection = () => {
    // Clear quiz state and go back to topic selection
    setQuestions([]);
    setGenerationError(null);
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setComplete(false);
    setUserAnswers({});
    setQuizStartTime(null);
    setShouldAutoGenerate(false); // Prevent auto-generation, show selector instead
  };

  const retentionBoost = useMemo(
    () => (questions.length > 0 ? Math.round((score / questions.length) * 25) || 8 : 8),
    [score, questions.length]
  );

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    // Reset quiz state when changing sessions
    setQuestions([]);
    setGenerationError(null);
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setComplete(false);
    setUserAnswers({});
    setQuizStartTime(null);
  };

  const handleDeleteSession = useCallback(
    (sessionId: string, topicName: string) => {
      Alert.alert(
        'Delete Session?',
        `Are you sure you want to delete the quiz session for "${topicName}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeSession(sessionId);
                // If the deleted session was selected, clear selection
                if (selectedSessionId === sessionId) {
                  setSelectedSessionId(null);
                  setQuestions([]);
                  setGenerationError(null);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to delete session. Please try again.');
              }
            },
          },
        ]
      );
    },
    [removeSession, selectedSessionId]
  );

  const renderRightActions = useCallback(
    (sessionId: string, topicName: string) =>
      (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({
          inputRange: [-100, 0],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        });

        return (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(sessionId, topicName)}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <ThemedText style={styles.deleteButtonText}>🗑️ Delete</ThemedText>
            </Animated.View>
          </TouchableOpacity>
        );
      },
    [handleDeleteSession]
  );

  // Show session selector if multiple sessions available
  const showSessionSelector = availableSessions.length > 1 && !isGenerating && questions.length === 0 && !complete;

  // Show loading state while generating questions
  if (isGenerating) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={[Typography.body, { color: muted, marginTop: 16 }]}>
            🧠 Gemini is generating quiz questions from your sleep cues...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state or session selector
  if (!complete && (generationError || (questions.length === 0 && !isGenerating))) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={showSessionSelector ? styles.selectorContainer : styles.centerContainer}
          showsVerticalScrollIndicator={false}>
          {showSessionSelector && (
            <View style={styles.sessionSelector}>
              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
                📚 Select a Session to Quiz
              </ThemedText>
              <ThemedText style={[Typography.body, { color: muted, marginBottom: 20 }]}>
                You have {availableSessions.length} completed sleep session{availableSessions.length !== 1 ? 's' : ''}
              </ThemedText>
              {availableSessions.map((session) => {
                const topic = session.topicId ? topics[session.topicId] : null;
                const topicName = topic?.name || `Session ${new Date(session.startedAt).toLocaleDateString()}`;
                const isSelected = session.id === selectedSessionId;
                const date = new Date(session.startedAt);
                const timeAgo = formatTimeAgo(date);
                
                // Debug logging
                if (__DEV__ && !topic) {
                  console.log('Morning Quiz: Session missing topic', {
                    sessionId: session.id,
                    topicId: session.topicId,
                    availableTopics: Object.keys(topics),
                  });
                }
                
                return (
                  <Swipeable
                    key={session.id}
                    renderRightActions={renderRightActions(session.id, topicName)}
                    overshootRight={false}>
                    <TouchableOpacity
                      style={[
                        styles.sessionCard,
                        { 
                          borderColor: isSelected ? accent : borderColor,
                          backgroundColor: isSelected ? `${accent}15` : cardColor,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => handleSessionChange(session.id)}>
                      <View style={styles.sessionCardContent}>
                        <ThemedText type="defaultSemiBold">
                          {topicName}
                        </ThemedText>
                        <ThemedText style={[Typography.caption, { color: muted }]}>
                          {timeAgo} • {session.cueIdsPlayed?.length || 0} cues played
                        </ThemedText>
                      </View>
                      {isSelected && <ThemedText>✓</ThemedText>}
                    </TouchableOpacity>
                  </Swipeable>
                );
              })}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accent, marginTop: 16 }]}
                onPress={() => {
                  setShouldAutoGenerate(true); // Re-enable auto-generation for future
                  generateQuestions();
                }}
                disabled={!selectedSessionId}>
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                  Generate Quiz from Selected Session
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
          
          {!showSessionSelector && (
            <>
              <ThemedText type="subtitle">⚠️ No Quiz Available</ThemedText>
              <ThemedText style={[Typography.body, { color: muted, marginTop: 16, textAlign: 'center' }]}>
                {generationError || 'Complete a sleep session first to generate quiz questions!'}
              </ThemedText>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accent, marginTop: 24 }]}
                onPress={() => router.push('/sleep-mode')}>
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                  Start Sleep Session
                </ThemedText>
              </TouchableOpacity>
              {generationError && availableSessions.length > 0 && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: success, marginTop: 12 }]}
                  onPress={generateQuestions}>
                  <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                    Retry Generation
                  </ThemedText>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (complete) {
    const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null;
    const selectedTopic = selectedSession?.topicId ? topics[selectedSession.topicId] : null;
    const hasMultipleSessions = availableSessions.length > 1;

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
        <View style={styles.resultCard}>
          <ThemedText type="subtitle">Great job!</ThemedText>
          <ThemedText style={[Typography.body, { color: muted }]}>
            You answered {score} / {questions.length} questions.
          </ThemedText>
          {selectedTopic && (
            <ThemedText style={[Typography.caption, { color: muted, marginTop: 4 }]}>
              📚 {selectedTopic.name}
            </ThemedText>
          )}
          <View style={[styles.boostBubble, { backgroundColor: accent }]}>
            <ThemedText style={[Typography.bodySemi, styles.boostText]}>
              Estimated Retention Boost: +{retentionBoost}%
            </ThemedText>
          </View>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: success }]} onPress={resetQuiz}>
              <ThemedText style={[Typography.bodySemi, styles.buttonText]}>Replay Quiz</ThemedText>
            </TouchableOpacity>
            {hasMultipleSessions && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={backToTopicSelection}>
                <ThemedText style={[Typography.bodySemi, styles.buttonText]}>
                  Quiz Another Topic
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: cardColor, borderColor, borderWidth: 1 }]}
              onPress={() => router.push('/dashboard')}>
              <ThemedText type="defaultSemiBold">View Dashboard</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const current = questions[index];
  const progressLabel = `Question ${index + 1} of ${questions.length}`;
  const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null;
  const selectedTopic = selectedSession?.topicId ? topics[selectedSession.topicId] : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Morning Quiz</ThemedText>
          <ThemedText style={[Typography.caption, { color: muted }]}>{progressLabel}</ThemedText>
          <ThemedText style={[Typography.caption, { color: muted, fontSize: 11, marginTop: 4 }]}>
            ✨ Generated by Gemini from your sleep cues
          </ThemedText>
          {selectedTopic && (
            <ThemedText style={[Typography.caption, { color: accent, fontSize: 11, marginTop: 2 }]}>
              📚 Topic: {selectedTopic.name}
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <ThemedText style={[Typography.headingMd, styles.prompt]}>{current.prompt}</ThemedText>

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
                  style={{ color: isCorrect || isIncorrect ? '#0f1115' : textColor }}>
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
            <ThemedText type="defaultSemiBold" style={[Typography.bodySemi, styles.buttonText]}>
              {index === questions.length - 1 ? 'Finish' : 'Next'}
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
    padding: 24,
  },
  content: {
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectorContainer: {
    padding: 24,
    paddingBottom: 40,
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
  sessionSelector: {
    width: '100%',
    alignItems: 'stretch',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
  },
  sessionCardContent: {
    flex: 1,
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
