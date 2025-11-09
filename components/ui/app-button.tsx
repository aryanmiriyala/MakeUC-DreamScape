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
import { CARD_SHADOW } from '@/constants/shadow';
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
      style: customStyle,
    },
    ref
  ) => {
    const theme = useColorScheme() ?? 'light';
    const palette = Colors[theme];

    const { backgroundColor, textColor, borderColor } = resolveColors(variant, palette);

    const sizeStyle = size === 'lg' ? styles.sizeLg : styles.sizeMd;
    const isDisabled = disabled || loading;
    const usesShadow = backgroundColor !== 'transparent';
    const buttonVisualStyle = usesShadow
      ? {
          ...CARD_SHADOW,
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
        }
      : {
          backgroundColor,
          borderColor,
          borderWidth: 1,
        };

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

    const baseStyle: StyleProp<ViewStyle>[] = [
      styles.base,
      sizeStyle,
      buttonVisualStyle,
      {
        opacity: isDisabled ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
      },
    ];

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        onPress={onPress}
        style={(pressState) => {
          const resolvedStyle =
            typeof customStyle === 'function'
              ? (customStyle as (state: PressableStateCallbackType) => StyleProp<ViewStyle>)(pressState)
              : customStyle;

          const composedStyle: StyleProp<ViewStyle>[] = [...baseStyle];

          if (pressState.pressed && !isDisabled) {
            composedStyle.push(styles.pressed);
          }

          appendStyle(composedStyle, resolvedStyle);

          return composedStyle;
        }}>
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
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});

function appendStyle(target: StyleProp<ViewStyle>[], value?: StyleProp<ViewStyle>) {
  if (value === null || value === undefined || value === false) {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      appendStyle(target, entry);
    }
    return;
  }

  target.push(value);
}
