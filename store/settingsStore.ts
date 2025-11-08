import { create } from 'zustand';

import { getSettings, saveSettings } from '@/lib/storage';
import { AppSettings, appSettingsSchema, defaultSettings } from '@/types';

interface SettingsStoreState {
  initialized: boolean;
  loading: boolean;
  error?: string;
  settings: AppSettings;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  error: undefined,
  settings: defaultSettings,

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
      const settings = await getSettings();
      set({ settings, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load settings';
      set({ error: message, loading: false });
    }
  },

  updateSettings: async (updates) => {
    const merged = {
      ...get().settings,
      ...updates,
    } satisfies AppSettings;

    try {
      const next = appSettingsSchema.parse(merged);
      await saveSettings(next);
      set({ settings: next });
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      set({ error: message });
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await saveSettings(defaultSettings);
      set({ settings: defaultSettings });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset settings';
      set({ error: message });
      throw error;
    }
  },
}));
