import { create } from 'zustand';

import {
  clearTopicData,
  createCuePayload,
  createItemPayload,
  createTopicPayload,
  deleteCue,
  deleteItem,
  deleteTopic,
  getCues,
  getItems,
  getTopics,
  putCue,
  putItem,
  putTopic,
} from '@/lib/storage';
import {
  Cue,
  Item,
  Topic,
} from '@/types';

interface TopicStoreState {
  initialized: boolean;
  loading: boolean;
  error?: string;
  topics: Record<string, Topic>;
  items: Record<string, Item>;
  cues: Record<string, Cue>;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addTopic: (payload: { name: string; description?: string; tags?: string[]; shortName?: string }) => Promise<Topic>;
  updateTopic: (
    topicId: string,
    updates: Partial<Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<Topic | undefined>;
  removeTopic: (topicId: string) => Promise<void>;
  addItem: (
    topicId: string,
    payload: { front: string; back: string; cueText?: string; audioUri?: string },
  ) => Promise<Item>;
  updateItem: (
    itemId: string,
    updates: Partial<Omit<Item, 'id' | 'topicId' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<Item | undefined>;
  removeItem: (itemId: string) => Promise<void>;
  addCue: (itemId: string, cueText: string, audioUri?: string) => Promise<Cue>;
  updateCue: (
    cueId: string,
    updates: Partial<Omit<Cue, 'id' | 'itemId' | 'topicId' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<Cue | undefined>;
  removeCue: (cueId: string) => Promise<void>;
  getItemsForTopic: (topicId: string) => Item[];
  getCuesForItem: (itemId: string) => Cue[];
  clearAll: () => Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useTopicStore = create<TopicStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  error: undefined,
  topics: {},
  items: {},
  cues: {},

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
      const [topics, items, cues] = await Promise.all([getTopics(), getItems(), getCues()]);
      set({ topics, items, cues, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load data';
      set({ error: message, loading: false });
    }
  },

  addTopic: async ({ name, description, tags = [], shortName }) => {
    try {
      const topic = createTopicPayload(name, description, tags, shortName);
      await putTopic(topic);

      set((state) => ({
        topics: {
          ...state.topics,
          [topic.id]: topic,
        },
      }));

      return topic;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create topic';
      set({ error: message });
      throw error;
    }
  },

  updateTopic: async (topicId, updates) => {
    const existing = get().topics[topicId];

    if (!existing) {
      set({ error: `Topic ${topicId} not found` });
      return undefined;
    }

    const nextTopic: Topic = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };

    try {
      await putTopic(nextTopic);
      set((state) => ({
        topics: {
          ...state.topics,
          [topicId]: nextTopic,
        },
      }));
      return nextTopic;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update topic';
      set({ error: message });
      throw error;
    }
  },

  removeTopic: async (topicId) => {
    const { items, cues } = get();
    const itemIds = Object.values(items)
      .filter((item) => item.topicId === topicId)
      .map((item) => item.id);

    const cueIds = Object.values(cues)
      .filter((cue) => itemIds.includes(cue.itemId))
      .map((cue) => cue.id);

    try {
      await Promise.all([
        deleteTopic(topicId),
        ...itemIds.map((id) => deleteItem(id)),
        ...cueIds.map((id) => deleteCue(id)),
      ]);

      set((state) => {
        const nextTopics = { ...state.topics };
        delete nextTopics[topicId];

        const nextItems = { ...state.items };
        itemIds.forEach((id) => delete nextItems[id]);

        const nextCues = { ...state.cues };
        cueIds.forEach((id) => delete nextCues[id]);

        return { topics: nextTopics, items: nextItems, cues: nextCues };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete topic';
      set({ error: message });
      throw error;
    }
  },

  addItem: async (topicId, { front, back, cueText, audioUri }) => {
    const topic = get().topics[topicId];

    if (!topic) {
      const message = `Topic ${topicId} not found`;
      set({ error: message });
      throw new Error(message);
    }

    const baseItem = createItemPayload(topicId, front, back, cueText);
    const item: Item = {
      ...baseItem,
      audioUri,
      updatedAt: nowIso(),
    };

    try {
      await putItem(item);
      set((state) => ({
        items: {
          ...state.items,
          [item.id]: item,
        },
      }));
      return item;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create item';
      set({ error: message });
      throw error;
    }
  },

  updateItem: async (itemId, updates) => {
    const existing = get().items[itemId];

    if (!existing) {
      set({ error: `Item ${itemId} not found` });
      return undefined;
    }

    const nextItem: Item = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };

    try {
      await putItem(nextItem);
      set((state) => ({
        items: {
          ...state.items,
          [itemId]: nextItem,
        },
      }));
      return nextItem;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      set({ error: message });
      throw error;
    }
  },

  removeItem: async (itemId) => {
    const cueIds = Object.values(get().cues)
      .filter((cue) => cue.itemId === itemId)
      .map((cue) => cue.id);

    try {
      await Promise.all([deleteItem(itemId), ...cueIds.map((id) => deleteCue(id))]);

      set((state) => {
        const nextItems = { ...state.items };
        delete nextItems[itemId];

        const nextCues = { ...state.cues };
        cueIds.forEach((id) => delete nextCues[id]);

        return { items: nextItems, cues: nextCues };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      set({ error: message });
      throw error;
    }
  },

  addCue: async (itemId, cueText, audioUri) => {
    const item = get().items[itemId];

    if (!item) {
      const message = `Item ${itemId} not found`;
      set({ error: message });
      throw new Error(message);
    }

    const cue = createCuePayload(item.topicId, itemId, cueText, audioUri);

    try {
      await putCue(cue);
      set((state) => ({
        cues: {
          ...state.cues,
          [cue.id]: cue,
        },
      }));
      return cue;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create cue';
      set({ error: message });
      throw error;
    }
  },

  updateCue: async (cueId, updates) => {
    const existing = get().cues[cueId];

    if (!existing) {
      set({ error: `Cue ${cueId} not found` });
      return undefined;
    }

    const nextCue: Cue = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };

    try {
      await putCue(nextCue);
      set((state) => ({
        cues: {
          ...state.cues,
          [cueId]: nextCue,
        },
      }));
      return nextCue;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cue';
      set({ error: message });
      throw error;
    }
  },

  removeCue: async (cueId) => {
    try {
      await deleteCue(cueId);
      set((state) => {
        const nextCues = { ...state.cues };
        delete nextCues[cueId];
        return { cues: nextCues };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete cue';
      set({ error: message });
      throw error;
    }
  },

  getItemsForTopic: (topicId) => {
    const items = get().items;
    return Object.values(items).filter((item) => item.topicId === topicId);
  },

  getCuesForItem: (itemId) => {
    const cues = get().cues;
    return Object.values(cues).filter((cue) => cue.itemId === itemId);
  },

  clearAll: async () => {
    try {
      await clearTopicData();
      set({
        topics: {},
        items: {},
        cues: {},
        error: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear all data';
      set({ error: message });
      throw error;
    }
  },
}));
