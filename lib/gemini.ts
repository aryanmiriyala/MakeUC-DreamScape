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

type TopicHeaderParams = {
  topicName: string;
  description?: string;
  maxLength?: number;
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

  const safeMimeType = sanitizeMimeType(mimeType);
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
                mimeType: safeMimeType,
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

export async function generateTopicHeader({
  topicName,
  description,
  maxLength = 20,
}: TopicHeaderParams): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your env.');
  }

  const constraints = [
    `Topic name: "${topicName.trim()}"`,
    description ? `Description: ${description.trim()}` : '',
    `Return a condensed label of at most ${maxLength} characters.`,
    'Use title case if possible, avoid emojis, punctuation, or numbering.',
    'Respond with the label text only (no quotes or explanations).',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generation_config: {
        temperature: 0.2,
        top_p: 0.9,
        max_output_tokens: 32,
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: constraints,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Gemini topic header failed (${response.status}): ${errorPayload}`);
  }

  const payload = await response.json();
  const textResponse: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Gemini returned an empty topic header response.');
  }

  const normalized = textResponse
    .split('\n')[0]
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  if (!normalized) {
    throw new Error('Gemini topic header response was blank.');
  }

  return normalized.slice(0, maxLength).trim();
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

function sanitizeMimeType(mime: string): string {
  if (mime === 'application/pdf' || mime === 'text/plain') {
    return mime;
  }
  return 'text/plain';
}

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
};

export type GenerateQuizParams = {
  cues: Array<{ cue: string; snippet: string }>;
  numQuestions?: number;
};

/**
 * Generate quiz questions based on sleep cues using Gemini
 */
export async function generateQuizFromCues({
  cues,
  numQuestions = 5,
}: GenerateQuizParams): Promise<QuizQuestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your env.');
  }

  if (!cues || cues.length === 0) {
    throw new Error('No cues provided to generate quiz questions');
  }

  // Format cues for the prompt
  const cueText = cues
    .map((c, idx) => `${idx + 1}. Cue: "${c.cue}" - Context: ${c.snippet}`)
    .join('\n');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generation_config: {
        temperature: 0.7,
        top_p: 0.95,
        max_output_tokens: 1024,
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a quiz generator. Based on the following learning cues from a sleep study session, generate ${numQuestions} multiple-choice questions to test retention.

Learning Cues:
${cueText}

Requirements:
- Each question should test understanding of the concepts in the cues
- Provide 4 options per question (one correct, three plausible distractors)
- Questions should be clear and concise
- Mix question types (recall, comprehension, application)

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "prompt": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option text (must match one of the options exactly)"
    }
  ]
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Gemini quiz generation failed (${response.status}): ${errorPayload}`);
  }

  const payload = await response.json();
  const textResponse = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Gemini returned an empty response for quiz generation.');
  }

  const sanitized = sanitizeGeminiJson(textResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new Error('Gemini quiz response was not valid JSON.');
  }

  const questions = (parsed as any)?.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Gemini response did not include valid questions array.');
  }

  return questions
    .map((q: any, index: number) => ({
      id: generateId(`quiz${index}`),
      prompt: typeof q?.prompt === 'string' ? q.prompt.trim() : '',
      options: Array.isArray(q?.options) ? q.options.map((opt: any) => String(opt).trim()) : [],
      answer: typeof q?.answer === 'string' ? q.answer.trim() : '',
    }))
    .filter(
      (q: QuizQuestion) =>
        q.prompt.length > 0 &&
        q.options.length === 4 &&
        q.answer.length > 0 &&
        q.options.includes(q.answer)
    )
    .slice(0, numQuestions);
}
