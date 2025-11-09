import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

const ELEVEN_BASE_URL = 'https://api.elevenlabs.io/v1';

export type TtsVoiceOptions = {
  voiceId?: string;
  modelId?: string;
  optimizeStreamingLatency?: number;
};

export type SynthesizedCue = {
  uri: string;
  bytes: number;
};

export type SoundEffectOptions = {
  prompt: string;
  durationSeconds?: number;
  promptInfluence?: number;
};

export type SynthesizedSoundEffect = {
  uri: string;
  bytes: number;
};

function getApiKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  const fromConfig = Constants?.expoConfig?.extra?.elevenlabsApiKey;
  const key = typeof fromEnv === 'string' && fromEnv.trim().length > 0 ? fromEnv : fromConfig;

  if (!key) {
    throw new Error('Missing ElevenLabs API key. Set EXPO_PUBLIC_ELEVENLABS_API_KEY or expo.extra.elevenlabsApiKey.');
  }

  return key;
}

function getDefaultVoice(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID;
  const fromConfig = Constants?.expoConfig?.extra?.elevenlabsVoiceId;
  return typeof fromEnv === 'string' && fromEnv.trim().length > 0 ? fromEnv : fromConfig;
}

function getCacheRoot(): string {
  const root = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!root) {
    throw new Error('File system cache directory unavailable');
  }
  return root.endsWith('/') ? root : `${root}/`;
}

async function ensureCacheFolder(folder: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(folder);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  }
}

function createCacheKey(text: string, voiceId: string | undefined): string {
  const normalized = `${text}\u0000${voiceId ?? 'default'}`.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);

    output += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    output += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 0x3f] : '=';
  }

  return output;
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && typeof data.detail[0]?.msg === 'string') {
      return data.detail[0].msg;
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
    return JSON.stringify(data);
  } catch (_error) {
    try {
      return await response.text();
    } catch (_inner) {
      return 'Unknown error';
    }
  }
}

export async function fetchCueAudio(text: string, options?: TtsVoiceOptions): Promise<SynthesizedCue> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot synthesize empty cue text');
  }

  const apiKey = getApiKey();
  const voiceId = options?.voiceId ?? getDefaultVoice();
  const targetVoice = voiceId ?? '21m00Tcm4TlvDq8ikWAM';
  const cacheRoot = getCacheRoot();
  const folder = `${cacheRoot}elevenlabs/`;
  const cacheKey = createCacheKey(text, targetVoice);
  const cachePath = `${folder}${cacheKey}.mp3`;

  await ensureCacheFolder(folder);

  const existing = await FileSystem.getInfoAsync(cachePath);
  if (existing.exists) {
    return { uri: cachePath, bytes: existing.size ?? 0 };
  }

  const response = await fetch(`${ELEVEN_BASE_URL}/text-to-speech/${targetVoice}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: options?.modelId ?? 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      optimize_streaming_latency: options?.optimizeStreamingLatency ?? 1,
    }),
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  await FileSystem.writeAsStringAsync(cachePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri: cachePath, bytes: base64.length * 0.75 };
}

/** 
 * @param options - Configuration for sound effect generation
 * @returns Promise with URI to the cached audio file
 */
export async function fetchAmbientAudio(options: SoundEffectOptions): Promise<SynthesizedSoundEffect> {
  const { prompt, durationSeconds = 30, promptInfluence = 0.3 } = options;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Cannot generate sound effect with empty prompt');
  }

  const apiKey = getApiKey();
  const cacheRoot = getCacheRoot();
  const folder = `${cacheRoot}elevenlabs-sfx/`;
  const cacheKey = createCacheKey(`${prompt}-${durationSeconds}`, undefined);
  const cachePath = `${folder}${cacheKey}.mp3`;

  await ensureCacheFolder(folder);

  // Check cache first
  const existing = await FileSystem.getInfoAsync(cachePath);
  if (existing.exists) {
    return { uri: cachePath, bytes: existing.size ?? 0 };
  }

  // Generate sound effect using ElevenLabs Sound Effects API
  const response = await fetch(`${ELEVEN_BASE_URL}/sound-generation`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: durationSeconds,
      prompt_influence: promptInfluence,
    }),
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(`ElevenLabs Sound Effects failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  await FileSystem.writeAsStringAsync(cachePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri: cachePath, bytes: base64.length * 0.75 };
}

/**
 * Pre-defined ambient prompts optimized for sleep/study sessions
 */
export const AMBIENT_PRESETS = {
  lofi: 'Soft lofi hip hop beats, mellow piano, gentle rain, calming and peaceful',
  rain: 'Gentle rain falling, distant thunder, peaceful nature ambience',
  ocean: 'Soft ocean waves, gentle beach sounds, calming seaside atmosphere',
  forest: 'Peaceful forest ambience, rustling leaves, distant birds, serene nature',
  cafe: 'Quiet coffee shop ambience, soft chatter, gentle acoustic music background',
  white_noise: 'Gentle white noise, soft static, calming background sound for focus',
  piano: 'Soft piano melody, ambient instrumental, peaceful and relaxing',
  meditation: 'Deep meditation sounds, Tibetan singing bowls, peaceful zen atmosphere',
} as const;

export type AmbientPreset = keyof typeof AMBIENT_PRESETS;

/**
 * Convenience function to generate ambient audio from preset
 */
export async function fetchAmbientPreset(
  preset: AmbientPreset,
  durationSeconds = 30
): Promise<SynthesizedSoundEffect> {
  return fetchAmbientAudio({
    prompt: AMBIENT_PRESETS[preset],
    durationSeconds,
    promptInfluence: 0.3,
  });
}

