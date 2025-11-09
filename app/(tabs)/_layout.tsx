import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const tabConfig = [
  { name: 'index', title: 'Home', icon: 'house.fill' },
  { name: 'add-flashcards', title: 'Flashcards', icon: 'square.stack.3d.up.fill' },
  { name: 'sleep-mode', title: 'Sleep', icon: 'bed.double.fill' },
  { name: 'dashboard', title: 'Dashboard', icon: 'chart.bar.xaxis' },
] as const;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 90,
          paddingBottom: 14,
          paddingTop: 18,
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderColor: palette.border,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          marginTop: -4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarHideOnKeyboard: true,
      }}>
      {tabConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <IconSymbol size={26} name={tab.icon} color={color} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="import-document" options={{ href: null }} />
      <Tabs.Screen name="morning-quiz" options={{ href: null }} />
    </Tabs>
  );
}
