# 🌙 Dreamscape – Sleep-Based Microlearning App  
### Product Requirements Document (PRD for Codex)  
_Last updated: November 2025_

---

## 1️⃣ Overview  
**Dreamscape** is a friendly, dark-themed mobile app that helps users learn passively while they sleep.  
Users can add flashcards manually or upload PDFs/TXT documents. The app uses **Gemini API** to summarize the content into short “cues,” which are then read aloud using **TTS** (local or ElevenLabs) during simulated sleep sessions.  
After waking up, users take a short quiz to reinforce what they learned and view progress analytics.

---

## 2️⃣ Theme & Visual Identity  

**Vibe:** Calm, futuristic, and welcoming.  

| Role | Color | Example use |
|------|--------|-------------|
| Background | `#0f1115` | main background |
| Card | `#1b1f2a` | topic & flashcard panels |
| Primary | `#3b82f6` | main buttons |
| Success | `#22c55e` | start / positive states |
| Danger | `#ef4444` | stop / delete |
| Text primary | `#ffffff` | headers |
| Text secondary | `#cbd5e1` | body text |
| Accent | `#6366f1` | highlights |
| Border | `#2a3246` | subtle separators |

- Rounded corners (12–16 px)
- Comfortable padding (16 px)
- Friendly emojis
- Micro-animations (fade-ins, pulsing dots)

---

## 3️⃣ Core Features (MVP Scope)

### 🏠 Home Screen  
- Title: “Dreamscape 🌙”  
- Shows a list of **Topics** as rounded cards  
- Buttons:
  - “+ New Topic” → create a topic  
  - “📄 Import Document” → upload PDF/TXT  
  - “Sleep Mode” → start simulated session  
  - “Morning Quiz” → recall test  
  - “Dashboard” → progress overview  
- Empty state: “No topics yet. Tap + New Topic to begin!”

---

### ✏️ Add Flashcards Screen  
- Title: “Topic: {topicName}”  
- Two input boxes: Front (term/question) & Back (definition/answer)  
- Button: “Add Flashcard”  
- List of flashcards with cue preview (`cue: “light to sugar”`)  
- Optional “Preview Cue” button (play TTS)

---

### 📄 Import Document Screen  
- Allows uploading `.pdf` or `.txt` files  
- Uses **Gemini API** to summarize content into ultra-short cues  
- Displays:
  - Filename & type
  - Button “✨ Generate Cues (Gemini)”
  - Loading spinner (“Summarizing with Gemini…”)
  - List of cue cards (≤5 words each) + source snippets
  - Button “💾 Save to Topic” → creates new Topic and Items  
- Cues are then playable in Sleep Mode.

---

### 😴 Sleep Mode Screen  
- Simulates “learning while sleeping” via short audio cues.  
- Displays:
  - Status: Ready / Playing / Stopped  
  - Cues played count  
  - Interval selector (3s / 5s / 10s demo)  
- Buttons:
  - Green “Start Sleep Session”
  - Red “Stop”  
- Animated text: “💤 Reinforcing memories…”  
- Plays cues via local `expo-speech` or ElevenLabs TTS.  

---

### ☀️ Morning Quiz Screen  
- Generates multiple-choice questions (via Gemini or local flashcards).  
- Progress indicator: “Question 2 of 5”  
- Four option buttons; highlight correct/incorrect answer  
- After quiz:
  - Shows score (e.g., “4 / 5”)  
  - “Estimated Retention Boost: +12%”  
  - “View Dashboard” button  

---

### 📊 Dashboard Screen  
- Displays:
  - “Total Cues Played”
  - “Average Retention Boost”
  - Line chart of “Recent Sessions”
  - Session history (date + cue count)
- Empty state: “No sessions yet.”

---

## 4️⃣ Future / Stretch Features

| Feature | Description |
|----------|--------------|
| **Gemini API (MCQs)** | Generate quiz questions from flashcards or documents |
| **ElevenLabs TTS** | Natural-sounding cue voices |
| **Auth0 Login** | Secure user profiles |
| **Vultr Deployment** | Host backend & Gemini/ElevenLabs API gateway |

---

## 5️⃣ Technical Implementation Notes  

- **Frontend:** React Native (Expo)  
- **Navigation:** `@react-navigation/native-stack`  
- **Storage:** `@react-native-async-storage/async-storage`  
- **TTS:** `expo-speech` (initial), upgrade to ElevenLabs  
- **Audio:** `expo-av` (for base64 MP3 playback)  
- **File Picker:** `expo-document-picker`  
- **Backend:** Express.js or FastAPI (on Vultr)  
- **Charts:** `victory-native` or `react-native-chart-kit`  
- **Keep Awake:** `expo-keep-awake` (for Sleep Mode)  

### Data Models
```js
Topic { id, name, createdAt }
Item { id, topicId, front, back, cue_text, timesCued }
Session { id, date_iso, cueCount, itemCount }
