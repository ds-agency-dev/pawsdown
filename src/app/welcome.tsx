import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from '@/components/MenuScreen';
import { PixelButton } from '@/components/PixelButton';
import { PixelText } from '@/components/PixelText';
import { Sprite } from '@/components/Sprite';
import { fonts, menu, motion, palette } from '@/design/tokens';

const A = menu.artPt;
const { snap, settle } = motion.springs;
// CRT power-on: the beam draws across, then the picture opens out of it.
const POWER_ON = { lineMs: 220, openDelayMs: 260, footerDelayMs: 520 } as const;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const beam = useSharedValue(reduceMotion ? 1 : 0);
  const open = useSharedValue(reduceMotion ? 1 : 0);
  const footer = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    beam.set(withTiming(1, { duration: POWER_ON.lineMs }));
    open.set(withDelay(POWER_ON.openDelayMs, withSpring(1, settle)));
    footer.set(withDelay(POWER_ON.footerDelayMs, withSpring(1, snap)));
  }, [reduceMotion, beam, open, footer]);

  const beamStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: beam.value }] }));
  const pictureStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, open.value * 2),
    transform: [{ scaleY: 0.02 + 0.98 * open.value }],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footer.value,
    transform: [{ translateY: (1 - footer.value) * 6 * A }],
  }));

  return (
    <MenuScreen>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 6 * A }]}>
        <View style={styles.middle}>
          <Animated.View style={[styles.beam, beamStyle]} />
          <Animated.View style={[styles.picture, pictureStyle]}>
            <View style={styles.pets}>
              <Sprite name="cat_sit" scale={3} />
              <Sprite name="dog_sit" scale={3} />
            </View>
            <View accessible accessibilityRole="header" accessibilityLabel="Pawsdown">
              <PixelText text="Pawsdown" px={5} color="lamp" shadow="night" decorative />
            </View>
            <Text style={styles.tagline}>A tiny pet for the end of your workday.</Text>
          </Animated.View>
        </View>
        <Animated.View style={[styles.footer, footerStyle]}>
          <PixelButton label="Set up my desk" full pulse onPress={() => router.push('/onboarding/workday')} />
          <Text style={styles.small}>About a minute. No account, ever.</Text>
        </Animated.View>
      </View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 8 * A },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 * A },
  beam: { alignSelf: 'stretch', marginHorizontal: 8 * A, height: A, backgroundColor: palette.glow },
  picture: { alignItems: 'center', gap: 6 * A },
  pets: { flexDirection: 'row', gap: 6 * A },
  tagline: {
    fontFamily: fonts.ui,
    fontSize: 20,
    lineHeight: 28,
    color: palette.parchment,
    textAlign: 'center',
    maxWidth: 100 * A,
  },
  footer: { gap: 3 * A, alignItems: 'center' },
  small: { fontFamily: fonts.ui, fontSize: 15, color: palette.smoke },
});
