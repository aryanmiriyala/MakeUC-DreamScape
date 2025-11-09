import type { ViewStyle } from 'react-native';

export const CARD_SHADOW: ViewStyle = {
  shadowColor: '#05070d',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.22,
  shadowRadius: 18,
  elevation: 6,
};

export function cardSurface(backgroundColor: string, extra?: ViewStyle): ViewStyle {
  return {
    ...CARD_SHADOW,
    backgroundColor,
    ...(extra ?? {}),
  };
}
