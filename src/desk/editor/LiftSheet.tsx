import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Sprite } from '@/components/Sprite';
import type { Pet } from '@/data/profile';
import { menu, motion, palette } from '@/design/tokens';
import { flipFeedback } from '@/motion/feedback';
import { useStepLoop } from '@/motion/step-loop';
import { ALL_COATS } from '@/render/bitmap';

const A = menu.artPt;
const { snap } = motion.springs;
const LIFT = menu.lift;
// Half-turns: going edge-on accelerates away (ease-in); coming face-up snaps open and overshoots a touch, like a
// card slapped down.
const EDGE_ON = { duration: LIFT.edgeOnMs, easing: Easing.bezier(0.55, 0, 0.85, 0.35) };
const FACE_UP = { duration: LIFT.faceUpMs, easing: Easing.out(Easing.back(1.6)) };
/** The pet is drawn at 3 pt per sprite px and shows this much of itself over the object's top edge. */
const PET_SCALE = 3;
export const PET_PEEK_PT = 13 * A;
const PET_PT = 32 * PET_SCALE;

/** A desk object's rect in points, relative to the desk screen, with its resting tilt. */
export interface LiftFrom {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rotDeg: number;
}

/** Where the lifted object settles: its top-left and width; the height comes from its content. */
export interface LiftTo {
  readonly x: number;
  readonly y: number;
  readonly w: number;
}

interface LiftSheetProps {
  readonly from: LiftFrom;
  readonly to: LiftTo;
  /** The desk's drawing of the object (DeskScene `flip`): turned edge-on while the editor has it. */
  readonly deskTurn: SharedValue<number>;
  /** Set by the owner to fly the object back to the desk; `onClosed` fires once it lands. */
  readonly closing: boolean;
  readonly onClosed: () => void;
  /** Tap outside the object. */
  readonly onDismiss: () => void;
  readonly pet: Pet;
  /** Changes on every keystroke or pick, so the pet can react. */
  readonly poke: number;
  /** Spoken name of the open editor, e.g. "Card 1". */
  readonly label: string;
  /** The object itself, laid out at `to.w`. */
  readonly face: ReactNode;
  /** Controls under the object (counter, chips, done); they fade in once it lands. */
  readonly below?: ReactNode;
}

/**
 * The clock-out editor pattern: a desk object springs off the desk toward you with a kick of tilt, the pet pops
 * up behind its top edge and hops as you type, and closing flies it back to its spot. The object is laid out
 * once at its full size and scaled from the desk rect, so text never reflows mid-flight.
 */
export function LiftSheet({
  from,
  to,
  deskTurn,
  closing,
  onClosed,
  onDismiss,
  pet,
  poke,
  label,
  face,
  below,
}: LiftSheetProps) {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  const lift = useSharedValue(0);
  const turn = useSharedValue(0);
  const peek = useSharedValue(0);
  const hop = useSharedValue(0);
  const blink = useStepLoop(true, motion.idle.blinkEveryMs[0] ?? 3200, motion.idle.blinkMs);
  const pokes = useRef(poke);
  const opened = useRef(false);

  const coat = ALL_COATS.find((c) => c.coat.key === `${pet.species}.${pet.coat}`)?.coat;

  // Opens once the face has measured itself, so the flight starts from the right scale. The desk's object turns
  // edge-on, and the copy turns face-up from edge-on as it lifts: the hand-over happens where neither shows.
  useEffect(() => {
    if (height === 0 || closing || opened.current) return;
    opened.current = true;
    const popPet = () => peek.set(reduced ? 1 : withSpring(1, snap));
    if (reduced) {
      deskTurn.set(0);
      lift.set(withTiming(1, { duration: 160 }, () => scheduleOnRN(popPet)));
      return;
    }
    flipFeedback();
    const rise = () => {
      turn.set(withTiming(1, FACE_UP));
      lift.set(
        withSpring(1, snap, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(popPet);
        }),
      );
    };
    deskTurn.set(
      withTiming(0, EDGE_ON, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(rise);
      }),
    );
  }, [height, closing, reduced, lift, peek, turn, deskTurn]);

  // Closing: the pet ducks, the copy glides home turning edge-on as it arrives, then the desk's object turns
  // face-up with a slap of the snap spring (showing what was written, now in pixel type).
  useEffect(() => {
    if (!closing) return;
    peek.set(withTiming(0, { duration: 90 }));
    const done = () => onClosed();
    if (reduced) {
      lift.set(
        withTiming(0, { duration: 160 }, (finished) => {
          'worklet';
          if (!finished) return;
          deskTurn.set(1);
          scheduleOnRN(done);
        }),
      );
      return;
    }
    const land = () => {
      flipFeedback();
      deskTurn.set(
        withTiming(1, FACE_UP, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(done);
        }),
      );
    };
    // An eased glide, not a spring: setting something down should land softly (a spring read as a snap).
    turn.set(withDelay(LIFT.returnMs - LIFT.edgeOnMs, withTiming(0, EDGE_ON)));
    lift.set(
      withTiming(0, { duration: LIFT.returnMs, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(land);
      }),
    );
  }, [closing, reduced, lift, peek, turn, deskTurn, onClosed]);

  // Every keystroke: a quick hop (the snap spring lands it with a little bounce).
  useEffect(() => {
    if (pokes.current === poke) return;
    pokes.current = poke;
    if (reduced) return;
    hop.set(withSequence(withTiming(1, { duration: 50 }), withSpring(0, snap)));
  }, [poke, reduced, hop]);

  const h = height || 1;
  const faceStyle = useAnimatedStyle(() => {
    const p = lift.value;
    const dx = from.x + from.w / 2 - (to.x + to.w / 2);
    const dy = from.y + from.h / 2 - (to.y + h / 2);
    // A kick of tilt mid-flight, so it feels picked up rather than zoomed.
    const kick = reduced ? 0 : Math.sin(Math.PI * Math.min(Math.max(p, 0), 1)) * LIFT.kickDeg;
    return {
      // Under Reduce Motion there's no turn, so the copy crossfades with the desk's drawing near the desk instead.
      opacity: height === 0 ? 0 : reduced ? interpolate(p, [0, LIFT.crossfade], [0, 1], Extrapolation.CLAMP) : 1,
      transform: [
        { translateX: interpolate(p, [0, 1], [dx, 0], Extrapolation.EXTEND) },
        { translateY: interpolate(p, [0, 1], [dy, 0], Extrapolation.EXTEND) },
        { rotate: `${interpolate(p, [0, 1], [from.rotDeg, 0], Extrapolation.EXTEND) + kick}deg` },
        // The turn is a pure horizontal squash, like the pixel cards' flip in the shutdown.
        { scaleX: interpolate(p, [0, 1], [from.w / to.w, 1], Extrapolation.EXTEND) * (reduced ? 1 : turn.value) },
        { scaleY: interpolate(p, [0, 1], [from.h / h, 1], Extrapolation.EXTEND) },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(lift.value, 0), 1) * LIFT.backdrop }));
  const belowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max((lift.value - 0.6) / 0.4, 0), 1),
  }));
  const petStyle = useAnimatedStyle(() => ({
    opacity: peek.value > 0.01 ? 1 : 0,
    transform: [{ translateY: (1 - peek.value) * PET_PEEK_PT - hop.value * 2 * A }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  // Re-measured on every layout: the boundary note grows when "Write my own" opens, and the controls follow it.
  const onFaceLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={closing ? 'none' : 'auto'}
      accessibilityViewIsModal
      accessibilityLabel={label}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Done"
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.pet, { left: to.x + to.w - PET_PT - 4 * A, top: to.y - PET_PEEK_PT }, petStyle]}>
        <Sprite name={`${pet.species}_sit`} scale={PET_SCALE} coat={coat} />
        <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
          <Sprite name={`${pet.species}_blink`} scale={PET_SCALE} coat={coat} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.face, { left: to.x, top: to.y, width: to.w }, faceStyle]} onLayout={onFaceLayout}>
        {face}
      </Animated.View>
      {below && height > 0 && (
        <Animated.View style={[styles.face, { left: to.x, top: to.y + height + 3 * A, width: to.w }, belowStyle]}>
          {below}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: palette.night },
  pet: { position: 'absolute', width: PET_PT, height: PET_PT },
  face: { position: 'absolute' },
});
