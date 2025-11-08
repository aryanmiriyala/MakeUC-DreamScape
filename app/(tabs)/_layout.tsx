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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
