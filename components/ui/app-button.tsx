import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const AppButton = forwardRef<View, AppButtonProps>(
  (
    {
      label,
      onPress,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = true,
      leadingIcon,
      trailingIcon,
      style,
    },
    ref
  ) => {
    const theme = useColorScheme() ?? 'light';
    const palette = Colors[theme];

    const { backgroundColor, textColor, borderColor } = resolveColors(variant, palette);

    const sizeStyle = size === 'lg' ? styles.sizeLg : styles.sizeMd;
    const isDisabled = disabled || loading;

    const renderContent = () => {
      if (loading) {
        return <ActivityIndicator color={textColor} />;
      }

      return (
        <View style={styles.content}>
          {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
          <ThemedText type="defaultSemiBold" style={[styles.label, { color: textColor }]}>
            {label}
          </ThemedText>
          {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
        </View>
      );
    };

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        onPress={onPress}
        style={(state) => [
          styles.base,
          sizeStyle,
          {
            opacity: isDisabled ? 0.6 : 1,
            backgroundColor,
            borderColor,
            transform: state.pressed && !isDisabled ? [{ scale: 0.98 }] : undefined,
            width: fullWidth ? '100%' : undefined,
          },
          typeof style === 'function' ? (style as (state: PressableStateCallbackType) => StyleProp<ViewStyle>)(state) : style,
        ]}>
        {renderContent()}
      </Pressable>
    );
  }
);

AppButton.displayName = 'AppButton';

function resolveColors(variant: ButtonVariant, palette: typeof Colors.light) {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: palette.card,
        textColor: palette.text,
        borderColor: palette.border,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        textColor: palette.text,
        borderColor: palette.border,
      };
    case 'danger':
      return {
        backgroundColor: palette.danger,
        textColor: '#fdf4f4',
        borderColor: palette.danger,
      };
    default:
      return {
        backgroundColor: palette.primary,
        textColor: '#f8fafc',
        borderColor: palette.primary,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeMd: {
    minHeight: 48,
    paddingHorizontal: 18,
  },
  sizeLg: {
    minHeight: 56,
    paddingHorizontal: 22,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  label: {
    textAlign: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
