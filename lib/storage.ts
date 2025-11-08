import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import {
  AppSettings,
  Cue,
  CueEvent,
  Item,
  QuizResult,
  SleepSession,
  Topic,
  appSettingsSchema,
  cueEventSchema,
  cueSchema,
  defaultSettings,
  itemSchema,
  quizResultSchema,
  sleepSessionSchema,
  topicSchema,
} from '@/types';

const STORAGE_VERSION = 1;
const NAMESPACE = '@dreamscape';
const VERSION_KEY = `${NAMESPACE}:storageVersion`;

const STORAGE_KEYS = {
  topics: `${NAMESPACE}:topics`,
  items: `${NAMESPACE}:items`,
  cues: `${NAMESPACE}:cues`,
  sleepSessions: `${NAMESPACE}:sleepSessions`,
  cueEvents: `${NAMESPACE}:cueEvents`,
  quizResults: `${NAMESPACE}:quizResults`,
  settings: `${NAMESPACE}:settings`,
} as const;

type TopicsMap = Record<string, Topic>;
type ItemsMap = Record<string, Item>;
type CuesMap = Record<string, Cue>;
type SleepSessionsMap = Record<string, SleepSession>;

type StorageSnapshot = {
  topics: TopicsMap;
  items: ItemsMap;
  cues: CuesMap;
  sleepSessions: SleepSessionsMap;
  cueEvents: CueEvent[];
  quizResults: QuizResult[];
  settings: AppSettings;
};

const topicRecordSchema = z.record(topicSchema) as z.ZodType<TopicsMap>;
const itemRecordSchema = z.record(itemSchema) as z.ZodType<ItemsMap>;
const cueRecordSchema = z.record(cueSchema) as z.ZodType<CuesMap>;
const sleepSessionRecordSchema = z
  .record(sleepSessionSchema) as z.ZodType<SleepSessionsMap>;
const cueEventListSchema = z.array(cueEventSchema) as z.ZodType<CueEvent[]>;
const quizResultListSchema = z.array(quizResultSchema) as z.ZodType<QuizResult[]>;

const migrations: Record<number, (snapshot: StorageSnapshot) => StorageSnapshot | Promise<StorageSnapshot>> = {};

async function ensureStorageReady(): Promise<void> {
  const rawVersion = await AsyncStorage.getItem(VERSION_KEY);

  if (!rawVersion) {
    await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION.toString());
    return;
  }

  const parsedVersion = Number(rawVersion);

  if (Number.isNaN(parsedVersion)) {
    // If the version is corrupted, reset to the current version without touching data.
    await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION.toString());
    return;
  }

  if (parsedVersion < STORAGE_VERSION) {
    await runMigrations(parsedVersion);
  }
}

async function runMigrations(currentVersion: number): Promise<void> {
  let workingVersion = currentVersion;
  let snapshot = await readSnapshot();

  while (workingVersion < STORAGE_VERSION) {
    const targetVersion = workingVersion + 1;
    const migration = migrations[targetVersion];

    if (migration) {
      snapshot = await migration(snapshot);
    }

    workingVersion = targetVersion;
  }

  await writeSnapshot(snapshot);
  await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION.toString());
}

async function readSnapshot(): Promise<StorageSnapshot> {
  const [topics, items, cues, sleepSessions, cueEvents, quizResults, settings] = await Promise.all([
    readJson(STORAGE_KEYS.topics, {} as TopicsMap, topicRecordSchema),
    readJson(STORAGE_KEYS.items, {} as ItemsMap, itemRecordSchema),
    readJson(STORAGE_KEYS.cues, {} as CuesMap, cueRecordSchema),
    readJson(STORAGE_KEYS.sleepSessions, {} as SleepSessionsMap, sleepSessionRecordSchema),
    readJson(STORAGE_KEYS.cueEvents, [] as CueEvent[], cueEventListSchema),
    readJson(STORAGE_KEYS.quizResults, [] as QuizResult[], quizResultListSchema),
    readJson(STORAGE_KEYS.settings, defaultSettings, appSettingsSchema),
  ]);

  return { topics, items, cues, sleepSessions, cueEvents, quizResults, settings };
}

async function writeSnapshot(snapshot: StorageSnapshot): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.topics, JSON.stringify(snapshot.topics)),
    AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(snapshot.items)),
    AsyncStorage.setItem(STORAGE_KEYS.cues, JSON.stringify(snapshot.cues)),
    AsyncStorage.setItem(STORAGE_KEYS.sleepSessions, JSON.stringify(snapshot.sleepSessions)),
    AsyncStorage.setItem(STORAGE_KEYS.cueEvents, JSON.stringify(snapshot.cueEvents)),
    AsyncStorage.setItem(STORAGE_KEYS.quizResults, JSON.stringify(snapshot.quizResults)),
    AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(snapshot.settings)),
  ]);
}

async function readJson<T>(key: string, fallback: T, schema?: z.ZodType<T>): Promise<T> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!schema) {
      return parsed as T;
    }

    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.warn(`[storage] Validation failed for key ${key}`, result.error);
    return fallback;
  } catch (error) {
    console.warn(`[storage] Failed to parse key ${key}`, error);
    return fallback;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getTopics(): Promise<TopicsMap> {
  await ensureStorageReady();
  return readJson(STORAGE_KEYS.topics, {} as TopicsMap, topicRecordSchema);
}

export async function putTopic(topic: Topic): Promise<TopicsMap> {
  const topics = await getTopics();
  topics[topic.id] = topic;
  await AsyncStorage.setItem(STORAGE_KEYS.topics, JSON.stringify(topics));
  return topics;
}

export async function deleteTopic(topicId: string): Promise<TopicsMap> {
  const topics = await getTopics();
  delete topics[topicId];
  await AsyncStorage.setItem(STORAGE_KEYS.topics, JSON.stringify(topics));
  return topics;
}

export async function getItems(): Promise<ItemsMap> {
  await ensureStorageReady();
  return readJson(STORAGE_KEYS.items, {} as ItemsMap, itemRecordSchema);
}

export async function putItem(item: Item): Promise<ItemsMap> {
  const items = await getItems();
  items[item.id] = item;
  await AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
  return items;
}

export async function deleteItem(itemId: string): Promise<ItemsMap> {
  const items = await getItems();
  delete items[itemId];
  await AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
  return items;
}

export async function getItemsByTopic(topicId: string): Promise<Item[]> {
  const items = await getItems();
  return Object.values(items).filter((item) => item.topicId === topicId);
}

export async function getCues(): Promise<CuesMap> {
  await ensureStorageReady();
  return readJson(STORAGE_KEYS.cues, {} as CuesMap, cueRecordSchema);
}

export async function putCue(cue: Cue): Promise<CuesMap> {
  const cues = await getCues();
  cues[cue.id] = cue;
  await AsyncStorage.setItem(STORAGE_KEYS.cues, JSON.stringify(cues));
  return cues;
}

export async function deleteCue(cueId: string): Promise<CuesMap> {
  const cues = await getCues();
  delete cues[cueId];
  await AsyncStorage.setItem(STORAGE_KEYS.cues, JSON.stringify(cues));
  return cues;
}

export async function getSleepSessions(): Promise<SleepSessionsMap> {
  await ensureStorageReady();
  return readJson(STORAGE_KEYS.sleepSessions, {} as SleepSessionsMap, sleepSessionRecordSchema);
}

export async function putSleepSession(session: SleepSession): Promise<SleepSessionsMap> {
  const sessions = await getSleepSessions();
  sessions[session.id] = session;
  await AsyncStorage.setItem(STORAGE_KEYS.sleepSessions, JSON.stringify(sessions));
  return sessions;
}

export async function deleteSleepSession(sessionId: string): Promise<SleepSessionsMap> {
  const sessions = await getSleepSessions();
  delete sessions[sessionId];
  await AsyncStorage.setItem(STORAGE_KEYS.sleepSessions, JSON.stringify(sessions));
  return sessions;
}

export async function appendCueEvent(event: CueEvent): Promise<CueEvent[]> {
  await ensureStorageReady();
  const events = await readJson(STORAGE_KEYS.cueEvents, [] as CueEvent[], cueEventListSchema);
  events.push(event);
  await AsyncStorage.setItem(STORAGE_KEYS.cueEvents, JSON.stringify(events));
  return events;
}

export async function getCueEvents(sessionId?: string): Promise<CueEvent[]> {
  await ensureStorageReady();
  const events = await readJson(STORAGE_KEYS.cueEvents, [] as CueEvent[], cueEventListSchema);

  if (!sessionId) {
    return events;
  }

  return events.filter((event) => event.sessionId === sessionId);
}

export async function appendQuizResult(result: QuizResult): Promise<QuizResult[]> {
  await ensureStorageReady();
  const results = await readJson(STORAGE_KEYS.quizResults, [] as QuizResult[], quizResultListSchema);
  results.push(result);
  await AsyncStorage.setItem(STORAGE_KEYS.quizResults, JSON.stringify(results));
  return results;
}

export async function getQuizResults(topicId?: string): Promise<QuizResult[]> {
  await ensureStorageReady();
  const results = await readJson(STORAGE_KEYS.quizResults, [] as QuizResult[], quizResultListSchema);

  if (!topicId) {
    return results;
  }

  return results.filter((result) => result.topicId === topicId);
}

export async function getSettings(): Promise<AppSettings> {
  await ensureStorageReady();
  return readJson(STORAGE_KEYS.settings, defaultSettings, appSettingsSchema);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureStorageReady();
  const validated = appSettingsSchema.parse(settings);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(validated));
}

export async function resetStorage(): Promise<void> {
  await ensureStorageReady();
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => AsyncStorage.removeItem(key)));
  await AsyncStorage.setItem(VERSION_KEY, STORAGE_VERSION.toString());
}

export function createTopicPayload(name: string, description?: string, tags: string[] = []): Topic {
  const timestamp = nowIso();

  return topicSchema.parse({
    id: generateId('topic'),
    name,
    description,
    tags,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createItemPayload(topicId: string, front: string, back: string, cueText?: string): Item {
  const timestamp = nowIso();

  return itemSchema.parse({
    id: generateId('item'),
    topicId,
    front,
    back,
    cueText,
    timesCued: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createCuePayload(topicId: string, itemId: string, cueText: string, audioUri?: string): Cue {
  const timestamp = nowIso();

  return cueSchema.parse({
    id: generateId('cue'),
    topicId,
    itemId,
    cueText,
    audioUri,
    playCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createSleepSessionPayload(topicId?: string, plannedCueIds: string[] = []): SleepSession {
  const timestamp = nowIso();

  return sleepSessionSchema.parse({
    id: generateId('session'),
    topicId,
    startedAt: timestamp,
    endedAt: undefined,
    plannedCueIds,
    cueIdsPlayed: [],
    interruptions: 0,
    status: 'scheduled',
    notes: undefined,
  });
}

export function createCueEventPayload(params: {
  sessionId: string;
  topicId?: string;
  itemId: string;
  cueId?: string;
  volume: number;
  status: CueEvent['status'];
  suppressedReason?: CueEvent['suppressedReason'];
  durationSeconds?: number;
}): CueEvent {
  return cueEventSchema.parse({
    id: generateId('event'),
    sessionId: params.sessionId,
    topicId: params.topicId,
    itemId: params.itemId,
    cueId: params.cueId,
    timestamp: nowIso(),
    volume: params.volume,
    status: params.status,
    suppressedReason: params.suppressedReason,
    durationSeconds: params.durationSeconds,
  });
}

export function createQuizResultPayload(params: {
  topicId: string;
  sessionId?: string;
  score: number;
  previousScore?: number;
  items: QuizResult['items'];
  durationMs?: number;
}): QuizResult {
  return quizResultSchema.parse({
    id: generateId('quiz'),
    topicId: params.topicId,
    sessionId: params.sessionId,
    completedAt: nowIso(),
    score: params.score,
    previousScore: params.previousScore,
    items: params.items,
    durationMs: params.durationMs,
  });
}

export async function clearSleepData(): Promise<void> {
  await ensureStorageReady();
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.sleepSessions),
    AsyncStorage.removeItem(STORAGE_KEYS.cueEvents),
  ]);
}

export async function clearQuizResults(): Promise<void> {
  await ensureStorageReady();
  await AsyncStorage.removeItem(STORAGE_KEYS.quizResults);
}
