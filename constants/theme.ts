/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const darkPalette = {
  background: '#0f1115',
  card: '#1b1f2a',
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  text: '#ffffff',
  textSecondary: '#cbd5e1',
  accent: '#6366f1',
  border: '#2a3246',
};

const lightPalette = {
  background: '#f5f7fb',
  card: '#ffffff',
  primary: '#2563eb',
  success: '#16a34a',
  danger: '#dc2626',
  text: '#111827',
  textSecondary: '#475569',
  accent: '#7c3aed',
  border: '#dbe0f0',
};

export const Colors = {
  light: {
    ...lightPalette,
    tint: lightPalette.primary,
    icon: lightPalette.textSecondary,
    tabIconDefault: '#94a3b8',
    tabIconSelected: lightPalette.primary,
  },
  dark: {
    ...darkPalette,
    tint: darkPalette.primary,
    icon: darkPalette.textSecondary,
    tabIconDefault: '#64748b',
    tabIconSelected: darkPalette.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
