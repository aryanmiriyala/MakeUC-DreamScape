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
      <View style={styles.row}>
        <View style={styles.leadingGroup}>
          {leadingSlot}
          <ThemedText type="title">{title}</ThemedText>
        </View>
        {actionSlot}
      </View>
      {subtitle ? (
        <ThemedText style={[Typography.caption, { color: subtitleColor }]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    flexShrink: 1,
  },
});
