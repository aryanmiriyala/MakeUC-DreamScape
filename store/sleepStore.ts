import { create } from 'zustand';

import {
    appendCueEvent,
    clearSleepData,
    createCueEventPayload,
    createSleepSessionPayload,
    deleteSleepSession,
    getCueEvents,
    getSleepSessions,
    putSleepSession,
} from '@/lib/storage';
import { CueEvent, SleepSession } from '@/types';

interface SleepStoreState {
  initialized: boolean;
  loading: boolean;
  error?: string;
  sessions: Record<string, SleepSession>;
  cueEvents: CueEvent[];
  activeSessionId?: string;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  startSession: (params: { topicId?: string; plannedCueIds?: string[] }) => Promise<SleepSession>;
  updateSession: (
    sessionId: string,
    updates: Partial<Omit<SleepSession, 'id' | 'startedAt'>>,
  ) => Promise<SleepSession | undefined>;
  completeSession: (
    sessionId: string,
    summary?: Partial<Pick<SleepSession, 'cueIdsPlayed' | 'interruptions' | 'avgNoise' | 'avgMotion' | 'notes'>>,
  ) => Promise<SleepSession | undefined>;
  cancelSession: (sessionId: string, notes?: string) => Promise<SleepSession | undefined>;
  removeSession: (sessionId: string) => Promise<void>;
  logCueEvent: (params: {
    sessionId: string;
    topicId?: string;
    itemId: string;
    cueId?: string;
    volume: number;
    status: CueEvent['status'];
    suppressedReason?: CueEvent['suppressedReason'];
    durationSeconds?: number;
  }) => Promise<CueEvent>;
  setActiveSession: (sessionId?: string) => void;
  getActiveSession: () => SleepSession | undefined;
  getCueEventsForSession: (sessionId: string) => CueEvent[];
  clearHistory: () => Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useSleepStore = create<SleepStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  error: undefined,
  sessions: {},
  cueEvents: [],
  activeSessionId: undefined,

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
      const [sessions, events] = await Promise.all([getSleepSessions(), getCueEvents()]);
      set({ sessions, cueEvents: events, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load sleep data';
      set({ error: message, loading: false });
    }
  },

  startSession: async ({ topicId, plannedCueIds = [] }) => {
    const baseSession = createSleepSessionPayload(topicId, plannedCueIds);
    const session: SleepSession = {
      ...baseSession,
      status: 'active',
      startedAt: nowIso(),
    };

    try {
      await putSleepSession(session);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [session.id]: session,
        },
        activeSessionId: session.id,
      }));
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      set({ error: message });
      throw error;
    }
  },

  updateSession: async (sessionId, updates) => {
    const existing = get().sessions[sessionId];

    if (!existing) {
      set({ error: `Sleep session ${sessionId} not found` });
      return undefined;
    }

    const nextSession: SleepSession = {
      ...existing,
      ...updates,
    };

    try {
      await putSleepSession(nextSession);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession,
        },
      }));
      return nextSession;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update session';
      set({ error: message });
      throw error;
    }
  },

  completeSession: async (sessionId, summary) => {
    const existing = get().sessions[sessionId];

    if (!existing) {
      set({ error: `Sleep session ${sessionId} not found` });
      return undefined;
    }

    const nextSession: SleepSession = {
      ...existing,
      ...summary,
      endedAt: nowIso(),
      status: 'completed',
    };

    try {
      await putSleepSession(nextSession);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession,
        },
        activeSessionId: state.activeSessionId === sessionId ? undefined : state.activeSessionId,
      }));
      return nextSession;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete session';
      set({ error: message });
      throw error;
    }
  },

  cancelSession: async (sessionId, notes) => {
    const existing = get().sessions[sessionId];

    if (!existing) {
      set({ error: `Sleep session ${sessionId} not found` });
      return undefined;
    }

    const nextSession: SleepSession = {
      ...existing,
      status: 'cancelled',
      endedAt: nowIso(),
      notes: notes ?? existing.notes,
    };

    try {
      await putSleepSession(nextSession);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession,
        },
        activeSessionId: state.activeSessionId === sessionId ? undefined : state.activeSessionId,
      }));
      return nextSession;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel session';
      set({ error: message });
      throw error;
    }
  },

  removeSession: async (sessionId) => {
    try {
      await deleteSleepSession(sessionId);
      set((state) => {
        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];
        const nextCueEvents = state.cueEvents.filter((event) => event.sessionId !== sessionId);
        const isActive = state.activeSessionId === sessionId;

        return {
          sessions: nextSessions,
          cueEvents: nextCueEvents,
          activeSessionId: isActive ? undefined : state.activeSessionId,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove session';
      set({ error: message });
      throw error;
    }
  },

  logCueEvent: async ({ sessionId, topicId, itemId, cueId, volume, status, suppressedReason, durationSeconds }) => {
    const event = createCueEventPayload({
      sessionId,
      topicId,
      itemId,
      cueId,
      volume,
      status,
      suppressedReason,
      durationSeconds,
    });

    try {
      await appendCueEvent(event);

      if (status === 'played' && cueId) {
        await get().updateSession(sessionId, {
          cueIdsPlayed: Array.from(new Set([...(get().sessions[sessionId]?.cueIdsPlayed ?? []), cueId])),
        });
      }

      set((state) => ({ cueEvents: [...state.cueEvents, event] }));
      return event;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log cue event';
      set({ error: message });
      throw error;
    }
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  getActiveSession: () => {
    const { activeSessionId, sessions } = get();
    return activeSessionId ? sessions[activeSessionId] : undefined;
  },

  getCueEventsForSession: (sessionId) => {
    return get().cueEvents.filter((event) => event.sessionId === sessionId);
  },

  clearHistory: async () => {
    try {
      await clearSleepData();
      set({ sessions: {}, cueEvents: [], activeSessionId: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear sleep data';
      set({ error: message });
      throw error;
    }
  },
}));
