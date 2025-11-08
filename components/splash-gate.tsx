import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const LOGO = require('@/assets/images/logo.png');
const SPLASH_BACKGROUND = '#020617';

type SplashGateProps = {
  children: ReactNode;
  /**
   * Optional duration override for the fade animation (ms).
   */
  fadeDuration?: number;
  /**
   * How long the logo should rest on screen before fading (ms).
   */
  delay?: number;
};

export function SplashGate({ children, fadeDuration = 600, delay = 900 }: SplashGateProps) {
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeDuration,
        useNativeDriver: true,
      }).start(() => setDismissed(true));
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, fadeDuration, opacity]);

  return (
    <View style={styles.root}>
      {children}
      {!dismissed && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity }, { backgroundColor: SPLASH_BACKGROUND }]}
        >
          <Image source={LOGO} resizeMode="cover" style={styles.fullscreenImage} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    overflow: 'hidden',
  },
  fullscreenImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
