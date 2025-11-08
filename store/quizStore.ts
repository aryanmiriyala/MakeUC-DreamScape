import { create } from 'zustand';

import {
    appendQuizResult,
    clearQuizResults,
    createQuizResultPayload,
    getQuizResults,
} from '@/lib/storage';
import { QuizResult, QuizResultItem } from '@/types';

interface QuizStoreState {
  initialized: boolean;
  loading: boolean;
  error?: string;
  results: QuizResult[];
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  recordResult: (params: {
    topicId: string;
    sessionId?: string;
    score: number;
    previousScore?: number;
    items: QuizResultItem[];
    durationMs?: number;
  }) => Promise<QuizResult>;
  getResultsForTopic: (topicId: string) => QuizResult[];
  getLatestResultForTopic: (topicId: string) => QuizResult | undefined;
  clearResults: () => Promise<void>;
}

export const useQuizStore = create<QuizStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  error: undefined,
  results: [],

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    await get().refresh();
    set({ initialized: true });
  },

  refresh: async () => {
    set({ loading: true, error: undefined });

    try {
      const results = await getQuizResults();
      set({ results, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load quiz results';
      set({ error: message, loading: false });
    }
  },

  recordResult: async ({ topicId, sessionId, score, previousScore, items, durationMs }) => {
    try {
      const result = createQuizResultPayload({
        topicId,
        sessionId,
        score,
        previousScore,
        items,
        durationMs,
      });

      const results = await appendQuizResult(result);
      set({ results });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save quiz result';
      set({ error: message });
      throw error;
    }
  },

  getResultsForTopic: (topicId) => {
    return get().results.filter((result) => result.topicId === topicId);
  },

  getLatestResultForTopic: (topicId) => {
    const topicResults = get().results
      .filter((result) => result.topicId === topicId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    return topicResults[0];
  },

  clearResults: async () => {
    try {
      await clearQuizResults();
      set({ results: [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear quiz results';
      set({ error: message });
      throw error;
    }
  },
}));
