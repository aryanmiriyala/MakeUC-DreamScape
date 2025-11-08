import { z } from 'zod';

export const topicSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().max(512).optional(),
  tags: z.array(z.string().min(1)).catch([]),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Topic = z.infer<typeof topicSchema>;

export const itemSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  cueText: z.string().min(1).max(48).optional(),
  audioUri: z.string().url().optional(),
  lastEveningScore: z.number().min(0).max(100).optional(),
  lastMorningScore: z.number().min(0).max(100).optional(),
  timesCued: z.number().int().nonnegative().catch(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Item = z.infer<typeof itemSchema>;

export const cueSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  itemId: z.string(),
  cueText: z.string().min(1).max(48),
  audioUri: z.string().url().optional(),
  durationSeconds: z.number().positive().max(5).optional(),
  lastPlayedAt: z.string().datetime({ offset: true }).optional(),
  playCount: z.number().int().nonnegative().catch(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Cue = z.infer<typeof cueSchema>;

export const sleepSessionSchema = z.object({
  id: z.string(),
  topicId: z.string().optional(),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }).optional(),
  plannedCueIds: z.array(z.string()),
  cueIdsPlayed: z.array(z.string()),
  interruptions: z.number().int().nonnegative().catch(0),
  avgNoise: z.number().nonnegative().optional(),
  avgMotion: z.number().nonnegative().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

export type SleepSession = z.infer<typeof sleepSessionSchema>;

export const cueEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  topicId: z.string().optional(),
  itemId: z.string(),
  cueId: z.string().optional(),
  timestamp: z.string().datetime({ offset: true }),
  volume: z.number().min(0).max(1),
  status: z.enum(['played', 'suppressed', 'skipped']),
  suppressedReason: z
    .enum(['motion', 'noise', 'user', 'schedule', 'unknown'])
    .optional(),
  durationSeconds: z.number().nonnegative().optional(),
});

export type CueEvent = z.infer<typeof cueEventSchema>;

export const quizResultItemSchema = z.object({
  itemId: z.string(),
  prompt: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  correct: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  timeMs: z.number().int().nonnegative().optional(),
});

export type QuizResultItem = z.infer<typeof quizResultItemSchema>;

export const quizResultSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  sessionId: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }),
  score: z.number().min(0).max(100),
  previousScore: z.number().min(0).max(100).optional(),
  items: z.array(quizResultItemSchema),
  durationMs: z.number().int().nonnegative().optional(),
});

export type QuizResult = z.infer<typeof quizResultSchema>;

export const appSettingsSchema = z.object({
  maxCuesPerNight: z.number().int().min(1).max(24),
  minCueIntervalMinutes: z.number().int().min(5).max(30),
  maxCueIntervalMinutes: z.number().int().min(5).max(45),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  volumeLevel: z.number().min(0).max(1),
  allowVibration: z.boolean(),
  themeMode: z.enum(['system', 'light', 'dark']),
  preferredVoice: z.string().optional(),
  autoStartSleepSession: z.boolean(),
  analyticsEnabled: z.boolean(),
  lastSyncedAt: z.string().datetime({ offset: true }).optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const defaultSettings: AppSettings = {
  maxCuesPerNight: 12,
  minCueIntervalMinutes: 8,
  maxCueIntervalMinutes: 15,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  volumeLevel: 0.4,
  allowVibration: true,
  themeMode: 'system',
  preferredVoice: undefined,
  autoStartSleepSession: false,
  analyticsEnabled: false,
  lastSyncedAt: undefined,
};
