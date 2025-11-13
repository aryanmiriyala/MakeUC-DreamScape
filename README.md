# 🌙 DreamScape

![DreamScape logo](assets/images/DreamScape_img.jpg)

**DreamScape** is an innovative sleep-based microlearning app that helps you learn passively while you rest. Built for MakeUC Hackathon, this Expo-powered mobile application enables users to create flashcards, import documents, and listen to gentle audio cues during simulated sleep sessions—reinforcing knowledge through subconscious repetition.

## ✨ Features

### **Personalized Learning Topics**

Create custom topics and flashcards tailored to what you want to learn. Each flashcard is converted into concise audio "cues" that play during sleep sessions.

### **Smart Document Import**

Upload PDF or TXT documents and use AI-powered summarization (Gemini API) to automatically extract key concepts as ultra-short learning cues.

### **Sleep Mode**

Activate sleep sessions where audio cues are played at customizable intervals. The app uses text-to-speech to deliver gentle prompts while you rest, helping reinforce memory consolidation.

### **Morning Quiz**

Test your retention with AI-generated multiple-choice questions based on your flashcards and cues. Track your progress and see your estimated retention boost.

### **Analytics Dashboard**

Monitor your learning journey with comprehensive stats:

- Total cues played
- Average retention boost percentage
- Recent session history with visual charts
- 5-day activity overview

### **Sleep-Friendly Design**

Beautiful dark theme optimized for nighttime use with:

- Calm color palette (`#0f1115` background, `#3b82f6` accents)
- Smooth animations and haptic feedback
- Comfortable rounded UI elements
- Dark mode-aware theming

## 🏗️ Architecture

### Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router v6 with file-based routing
- **State Management:** Zustand stores with TypeScript
- **Storage:** AsyncStorage for local persistence
- **Type Safety:** TypeScript + Zod schemas
- **UI Components:** Custom themed components with reusable primitives
- **Audio:** Expo AV for audio playback
- **TTS:** Expo Speech (with planned ElevenLabs integration)

### Project Structure

```text
app/(tabs)/          # Tab-based navigation screens
  ├── dashboard.tsx       # Analytics & session history
  ├── add-flashcards.tsx  # Create topics & flashcards
  ├── import-document.tsx # Document upload & AI processing
  ├── sleep-mode.tsx      # Audio cue playback session
  ├── morning-quiz.tsx    # Retention testing
  └── settings.tsx        # App configuration

store/               # Zustand state stores
  ├── topicStore.ts       # Topics, items, cues
  ├── sleepStore.ts       # Sleep sessions & cue events
  ├── quizStore.ts        # Quiz data & results
  └── settingsStore.ts    # User preferences

lib/                 # Core utilities
  ├── storage.ts          # AsyncStorage wrappers
  ├── gemini.ts           # AI integration
  └── elevenlabs.ts       # TTS integration

components/          # Reusable UI components
types/              # TypeScript type definitions
constants/          # Theme, typography, shadows
```

### Data Models

- **Topic:** Learning subject containers
- **Item:** Individual flashcards with front/back content
- **Cue:** Audio snippets derived from items
- **Session:** Sleep mode playback records
- **CueEvent:** Individual cue play events with timestamps

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (optional)
- iOS Simulator, Android Emulator, or Expo Go app

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aryanmiriyala/MakeUC-DreamScape.git
   cd MakeUC-DreamScape
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

4. **Launch on your platform**

   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your device

### Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Launch on Android
npm run ios        # Launch on iOS
npm run web        # Launch in web browser
npm run lint       # Check for linting issues
npm run reset-project  # Reset to starter template
```

## 🎨 Theming & Branding

DreamScape uses a carefully crafted dark theme optimized for nighttime use:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Navy | `#0f1115` |
| Card Surface | Slate | `#1b1f2a` |
| Primary | Blue | `#3b82f6` |
| Success | Green | `#22c55e` |
| Danger | Red | `#ef4444` |
| Accent | Indigo | `#6366f1` |
| Border | Muted | `#2a3246` |

### Branding Assets

All branding assets are located in `assets/images/`:

- `icon.png` – App icon (1024x1024)
- `splash-icon.png` – Splash screen logo
- `android-icon-*.png` – Android adaptive icon layers
- Additional platform-specific variants

## 🔮 Future Enhancements

- **Auth0 Authentication:** Secure user accounts & cloud sync
- **Vultr Backend:** API gateway for AI services
- **Cross-device Sync:** Learn seamlessly across devices
- **Custom Audio:** Upload your own voice recordings
- **Watch App:** Sleep tracking integration

## 🤝 Contributing

This is a hackathon project built for MakeUC. Contributions, issues, and feature requests are welcome!

## 📄 License

This project was created for MakeUC Hackathon.

## 🔗 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [React Native](https://reactnative.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## 👥 Team

Built with ❤️ for MakeUC Hackathon

---

Happy Learning! Sweet dreams! 💭✨
