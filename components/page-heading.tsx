import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

type PageHeadingProps = {
  title: string;
  subtitle?: string;
  actionSlot?: React.ReactNode;
  leadingSlot?: React.ReactNode;
  spacing?: number;
  containerStyle?: ViewStyle;
};

export function PageHeading({
  title,
  subtitle,
  actionSlot,
  leadingSlot,
  spacing = 20,
  containerStyle,
}: PageHeadingProps) {
  const subtitleColor = useThemeColor({}, 'textSecondary');

  return (
    <View style={[styles.container, { marginBottom: spacing }, containerStyle]}>
      {leadingSlot ? <View style={styles.leadingWrapper}>{leadingSlot}</View> : null}
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText style={[Typography.caption, styles.subtitle, { color: subtitleColor }]}>
          {subtitle}
        </ThemedText>
      ) : null}
      {actionSlot ? <View style={styles.actionWrapper}>{actionSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingWrapper: {
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  actionWrapper: {
    marginTop: 8,
  },
});
