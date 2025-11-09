import * as FileSystem from 'expo-file-system/legacy';

import { generateId } from '@/lib/storage';

const DEFAULT_MODEL = 'gemini-1.5-flash-001';
const rawModel = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? DEFAULT_MODEL;
const modelPath = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/${modelPath}:generateContent`;

type SummarizeParams = {
  uri: string;
  mimeType: string;
  originalName?: string;
};

export type GeminiCue = {
  id: string;
  cue: string;
  snippet: string;
};

export async function summarizeDocumentWithGemini({
  uri,
  mimeType,
  originalName,
}: SummarizeParams): Promise<GeminiCue[]> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your env.');
  }

  const base64Encoding =
    (FileSystem as any)?.EncodingType?.Base64 ?? ('base64' as FileSystem.EncodingType);

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: base64Encoding,
  });

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generation_config: {
        temperature: 0.2,
        top_p: 0.95,
        max_output_tokens: 512,
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Summarize the attached document into no more than five ultra-short cues.',
                'Return JSON: {"cues":[{"cue":"<<=5 words>>","snippet":"<<<=140 chars>>"}]}',
                'Each cue should be a tiny prompt (<=5 words) and each snippet should explain why it matters.',
              ].join(' '),
            },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            {
              text: originalName ? `Filename: ${originalName}` : '',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorPayload}`);
  }

  const payload = await response.json();
  const textResponse = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Gemini returned an empty response.');
  }

  const sanitized = sanitizeGeminiJson(textResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new Error('Gemini response was not valid JSON.');
  }

  const cues = Array.isArray((parsed as any)?.cues) ? (parsed as any).cues : parsed;

  if (!Array.isArray(cues)) {
    throw new Error('Gemini response did not include a cues array.');
  }

  return cues
    .map((cue: any, index: number) => ({
      id: typeof cue?.id === 'string' ? cue.id : generateId(`geminiCue${index}`),
      cue: typeof cue?.cue === 'string' ? cue.cue.trim() : '',
      snippet: typeof cue?.snippet === 'string' ? cue.snippet.trim() : '',
    }))
    .filter((cue: GeminiCue) => cue.cue.length > 0 && cue.snippet.length > 0);
}

function sanitizeGeminiJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
  }
  return trimmed;
}
