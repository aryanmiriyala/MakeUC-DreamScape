# DreamScape

![DreamScape logo](assets/images/icon.png)

DreamScape is a nightly microlearning companion that helps you capture ideas before bed, listen to gentle “sleep mode” prompts while you rest, and review the highlights in the morning. The project is built with Expo Router, TypeScript, and a composable store/async storage layer so it can scale from a hackathon experiment into a polished cross-platform app.

## Highlights

- 🎯 **Personalized topics** – curate flashcards and cues for the areas you want to sharpen.
- 🌙 **Sleep-friendly UI** – soft gradients, haptic tabs, and dark-mode aware theming.
- 💤 **Bedtime flow** – add items, enable Sleep Mode, then review the retention dashboard when you wake up.
- ⚙️ **Typed architecture** – Zustand stores, Zod models, and shared UI primitives keep things reliable.

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the development server

   ```bash
   npx expo start
   ```

3. Launch the platform of your choice from the Expo CLI output (iOS simulator, Android emulator, web, or Expo Go).

The routed screens live under the `app/` directory. Modify `app/(tabs)` and the supporting components/stores to evolve product flows.

## Branding

All DreamScape branding assets live in `assets/images/`:

- `icon.png` – primary square logo (also used for splash and favicon variants).
- `android-icon-background.png` / `android-icon-foreground.png` / `android-icon-monochrome.png` – adaptive icon layers.
- `splash-icon.png` – Expo splash screen artwork.

Update these files if you tweak the color palette or illustration; Expo will automatically pick up the new assets.

## Project scripts

- `npm run lint` – check for lint issues
- `npm run reset-project` – restore the Expo starter state if you ever need a clean slate

## Useful references

- [Expo Router docs](https://docs.expo.dev/router/introduction/)
- [Expo Application Services](https://expo.dev/eas)
- [Zustand state management](https://github.com/pmndrs/zustand)
