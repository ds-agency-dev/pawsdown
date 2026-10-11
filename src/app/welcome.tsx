import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from '@/components/MenuScreen';
import { PixelButton } from '@/components/PixelButton';
import { PixelText } from '@/components/PixelText';
import { Sprite } from '@/components/Sprite';
import { color, fonts, menu, menuSwirlDim, palette } from '@/design/tokens';
import { landFeedback, powerOnFeedback, tapFeedback, thudFeedback, typeFeedback } from '@/motion/feedback';
import { useFloat } from '@/motion/float';

const A = menu.artPt;
const P = menu.powerOn;
const TITLE = 'Pawsdown';
const TITLE_PX = 5;
const PETS = [
  { kind: 'cat', atMs: P.petAtMs[0], blinkEveryMs: P.blinkEveryMs[0], breatheDelayMs: 0 },
  { kind: 'dog', atMs: P.petAtMs[1], blinkEveryMs: P.blinkEveryMs[1], breatheDelayMs: 400 },
] as const;
const OUT = Easing.out(Easing.cubic);
const END = {
  beam: 1,
  open: 1,
  flash: 0,
  warm: 1,
  hop: P.hopEnd,
  title: TITLE.length,
  titlePop: 0,
  tagline: 1,
  footer: 1,
} as const;
const INTRO_MS = P.footerAtMs + P.footerMs;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const start = (end: number) => (reduceMotion ? end : 0);

  const beam = useSharedValue(start(END.beam));
  const open = useSharedValue(start(END.open));
  const flash = useSharedValue(0);
  const warm = useSharedValue(start(END.warm));
  const cat = useSharedValue(start(END.hop));
  const dog = useSharedValue(start(END.hop));
  const title = useSharedValue(start(END.title));
  const titlePop = useSharedValue(0);
  const tagline = useSharedValue(start(END.tagline));
  const footer = useSharedValue(start(END.footer));
  const [introDone, setIntroDone] = useState(reduceMotion);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const swirlDim = useDerivedValue(() => P.warmFromDim + (menuSwirlDim - P.warmFromDim) * warm.value);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Tap anywhere during the intro: everything jumps to its resting state, silently.
  const skip = useCallback(() => {
    clearTimers();
    const ends: [SharedValue<number>, number][] = [
      [beam, END.beam],
      [open, END.open],
      [flash, END.flash],
      [warm, END.warm],
      [cat, END.hop],
      [dog, END.hop],
      [title, END.title],
      [titlePop, END.titlePop],
      [tagline, END.tagline],
      [footer, END.footer],
    ];
    for (const [value, end] of ends) {
      cancelAnimation(value);
      value.set(end);
    }
    setIntroDone(true);
  }, [clearTimers, beam, open, flash, warm, cat, dog, title, titlePop, tagline, footer]);

  useEffect(() => {
    if (reduceMotion) return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    beam.set(withDelay(P.dotAtMs, withTiming(1, { duration: P.beamMs, easing: Easing.out(Easing.exp) })));
    open.set(withDelay(P.openAtMs, withTiming(1, { duration: P.openMs, easing: OUT })));
    flash.set(
      withDelay(
        P.openAtMs,
        withSequence(
          withTiming(P.flashOpacity, { duration: 0 }),
          withTiming(0, { duration: P.flashMs, easing: Easing.out(Easing.quad) }),
        ),
      ),
    );
    warm.set(withDelay(P.openAtMs, withTiming(1, { duration: P.warmMs, easing: Easing.inOut(Easing.quad) })));
    const hopIn = (atMs: number) =>
      withDelay(atMs, withTiming(P.hopEnd, { duration: P.hopMs * P.hopEnd, easing: Easing.linear }));
    cat.set(hopIn(PETS[0].atMs));
    dog.set(hopIn(PETS[1].atMs));
    title.set(
      withDelay(P.titleAtMs, withTiming(TITLE.length, { duration: TITLE.length * P.letterMs, easing: Easing.linear })),
    );
    const landMs = P.titleAtMs + TITLE.length * P.letterMs;
    titlePop.set(
      withDelay(
        landMs,
        withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: P.titlePopMs, easing: OUT })),
      ),
    );
    tagline.set(withDelay(P.taglineAtMs, withTiming(1, { duration: P.fadeMs })));
    footer.set(withDelay(P.footerAtMs, withTiming(1, { duration: P.footerMs, easing: Easing.in(Easing.quad) })));

    at(P.dotAtMs, powerOnFeedback);
    at(P.openAtMs, thudFeedback);
    for (let i = 0; i < TITLE.length; i++) at(P.titleAtMs + i * P.letterMs, typeFeedback);
    at(landMs, landFeedback);
    at(INTRO_MS, tapFeedback);
    at(INTRO_MS, () => setIntroDone(true));
    return clearTimers;
  }, [reduceMotion, clearTimers, beam, open, flash, warm, cat, dog, title, titlePop, tagline, footer]);

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beam.value > 0 ? 1 - open.value : 0,
    // Starts as a dot one art px wide.
    transform: [{ scaleX: Math.max(A / width, beam.value) }],
  }));
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (-open.value * height) / 2 }] }));
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (open.value * height) / 2 }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (P.titlePopScale - 1) * titlePop.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footer.value,
    transform: [{ translateY: -(1 - footer.value) * P.footerDropPt }],
  }));

  return (
    <MenuScreen swirlDim={swirlDim}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 6 * A }]}>
        <View style={styles.middle}>
          <View style={styles.pets}>
            {PETS.map((pet, i) => (
              <Pet key={pet.kind} pet={pet} hop={i === 0 ? cat : dog} idle={introDone} />
            ))}
          </View>
          <Animated.View
            style={[styles.title, titleStyle]}
            accessible
            accessibilityRole="header"
            accessibilityLabel={TITLE}>
            {[...TITLE].map((char, i) => (
              <Letter key={i} char={char} index={i} progress={title} />
            ))}
          </Animated.View>
          <Animated.Text style={[styles.tagline, taglineStyle]}>A tiny pet for the end of your workday.</Animated.Text>
        </View>
        <Animated.View style={[styles.footer, footerStyle]}>
          <PixelButton label="Set up my desk" full pulse onPress={() => router.push('/onboarding/workday')} />
          <Text style={styles.small}>About a minute. No account, ever.</Text>
        </Animated.View>
      </View>
      {!introDone && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityElementsHidden>
          <Animated.View style={[styles.cover, flashStyle, { backgroundColor: palette.paper }]} />
          <Animated.View style={[styles.cover, styles.top, topStyle]} />
          <Animated.View style={[styles.cover, styles.bottom, bottomStyle]} />
          <Animated.View style={[styles.beam, { top: height / 2 - A / 2 }, beamStyle]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessible={false} />
        </View>
      )}
    </MenuScreen>
  );
}

/** One title letter: appears as `progress` reaches its index and stamps down from a pop over one letter's time. */
function Letter({ char, index, progress }: { char: string; index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, progress.value - index));
    const eased = 1 - (1 - t) ** 3;
    return {
      opacity: t > 0 ? 1 : 0,
      transform: [{ scale: P.letterPopScale - (P.letterPopScale - 1) * eased }],
    };
  });
  return (
    <Animated.View style={style}>
      <PixelText text={char} px={TITLE_PX} color="lamp" shadow="night" decorative />
    </Animated.View>
  );
}

/**
 * A pet hopping in: rises from below past its spot, drops onto it, squashes on landing (`hop` 0→1 is the hop,
 * 1→hopEnd the squash). Once idle it breathes and blinks on its own period.
 */
function Pet({ pet, hop, idle }: { pet: (typeof PETS)[number]; hop: SharedValue<number>; idle: boolean }) {
  const { kind, blinkEveryMs: every } = pet;
  const reduceMotion = useReducedMotion();
  const breathe = useFloat(idle, menu.float.halfPeriodMs, pet.breatheDelayMs);
  const blink = useSharedValue(0);

  useEffect(() => {
    if (!idle || reduceMotion) return;
    blink.set(
      withRepeat(
        withSequence(
          withDelay(every - P.blinkMs, withTiming(1, { duration: 0 })),
          withDelay(P.blinkMs, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(blink);
  }, [idle, reduceMotion, every, blink]);

  const hopStyle = useAnimatedStyle(() => {
    const t = hop.value;
    const rise = 0.55;
    let y: number;
    if (t < rise) {
      const k = 1 - (1 - t / rise) ** 2;
      y = P.hopFromPt + (-P.hopPeakPt - P.hopFromPt) * k;
    } else if (t < 1) {
      const k = ((t - rise) / (1 - rise)) ** 2;
      y = -P.hopPeakPt + P.hopPeakPt * k;
    } else {
      y = 0;
    }
    const squash = t > 1 ? Math.sin((Math.PI * (t - 1)) / (P.hopEnd - 1)) * P.squash : 0;
    return {
      opacity: t > 0 ? 1 : 0,
      transform: [{ translateY: y - breathe.value * menu.float.liftPt }, { scaleY: 1 - squash }, { scaleX: 1 + squash }],
    };
  });
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <Animated.View style={[styles.pet, hopStyle]}>
      <Sprite name={`${kind}_sit`} scale={3} />
      <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
        <Sprite name={`${kind}_blink`} scale={3} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 8 * A },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 * A },
  pets: { flexDirection: 'row', gap: 6 * A },
  pet: { transformOrigin: 'bottom' },
  title: { flexDirection: 'row', gap: TITLE_PX },
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
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.surfaceDeep },
  top: { bottom: '50%' },
  bottom: { top: '50%' },
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: A,
    backgroundColor: palette.paper,
    shadowColor: palette.glow,
    shadowOpacity: 1,
    shadowRadius: 3 * A,
    shadowOffset: { width: 0, height: 0 },
  },
});
