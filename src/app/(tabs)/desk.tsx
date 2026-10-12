import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePet, useWorkday } from '@/data/profile-store';
import { DeskScene } from '@/desk/DeskScene';
import type { DeskScript } from '@/desk/draw';
import { BUTTON, CARD, FAN, IDLE } from '@/desk/timeline';
import { useMinute } from '@/desk/use-minute';
import { type ShutdownPhase, useShutdown } from '@/desk/use-shutdown';
import { color, motion } from '@/design/tokens';
import { tapFeedback } from '@/motion/feedback';
import { clockLabel, shortClock } from '@/notifications/nudge';
import { type SizedArtGrid, useArtGrid, useCanvasSize } from '@/render/swirl';

/** Absolute style covering a scene rect (art px), for touch targets laid over the Skia art. */
function over(art: SizedArtGrid, x: number, y: number, w: number, h: number) {
  return {
    position: 'absolute' as const,
    left: (art.originX + x) * art.unitPt,
    top: (art.originY + y) * art.unitPt,
    width: w * art.unitPt,
    height: h * art.unitPt,
  };
}

const CARDS_LEFT = (FAN[0]?.x ?? 0) - CARD.w / 2 - 2;
const CARDS_TOP = (FAN[1]?.y ?? 0) - CARD.h / 2 - 2;
const CARDS_W = (FAN[2]?.x ?? 0) + CARD.w / 2 + 2 - CARDS_LEFT;
const CARDS_H = CARD.h + 8;

// Sample content so the shutdown can be judged on device before the clock-out flow (M4 step 2) feeds real cards.
const PREVIEW = {
  tasks: ['Send Q4 deck to Dana', 'Fix login bug #482', 'Prep 1:1 notes'],
  win: 'Shipped the onboarding fix',
};

const BUTTON_LABEL: Record<ShutdownPhase, string> = {
  idle: 'Clock out',
  filing: 'Skip',
  hold: 'Lights out',
  night: 'Skip',
  done: 'See you tomorrow',
};

export default function Desk() {
  const pet = usePet();
  const workday = useWorkday();
  const insets = useSafeAreaInsets();
  const [size, onLayout] = useCanvasSize();
  const art = useArtGrid(size, insets.top);
  const now = useMinute();
  const seq = useSharedValue(IDLE);
  const held = useSharedValue(0);
  const shutdown = useShutdown(seq);
  const { phase } = shutdown;
  const preview = phase !== 'idle';

  const minute = now.getHours() * 60 + now.getMinutes();
  const script = useMemo<DeskScript>(
    () => ({
      time: clockLabel(minute),
      ask: preview ? 'Ready to clock out?' : `Clock out at ${shortClock(workday.endMinute)}`,
      cards: preview ? 'filled' : 'slots',
      tasks: preview ? PREVIEW.tasks : [],
      win: preview ? PREVIEW.win : null,
      evenings: 1,
      button: 'Clock out',
      topLabel: "Tomorrow's top 3",
      asleep: false,
      panelTitle: 'Evening 1:',
      panelCaption: `${pet?.name ?? ''} clocks in`,
    }),
    [minute, workday.endMinute, preview, pet?.name],
  );

  if (!pet) return null;

  // Idle, the hold and the end wait for the button; while an act plays, a tap anywhere skips ahead.
  const buttonOnly = phase === 'idle' || phase === 'hold' || phase === 'done';
  const onButton = () => {
    if (phase === 'idle') {
      tapFeedback();
      shutdown.start();
    } else if (phase === 'hold') {
      tapFeedback();
      shutdown.lightsOut();
    } else if (phase === 'done') shutdown.reset();
    else shutdown.skip();
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <DeskScene script={script} pet={pet} art={art} seq={seq} held={held} />
      <View
        style={over(art, 0, 4, 135, 20)}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${script.time}. ${script.ask}`}
      />
      {phase === 'idle' && (
        <Pressable
          style={over(art, CARDS_LEFT, CARDS_TOP, CARDS_W, CARDS_H)}
          onPress={onButton}
          accessibilityRole="button"
          accessibilityLabel="Tomorrow's top 3. No cards yet."
          accessibilityHint="Starts the clock-out"
        />
      )}
      <Pressable
        style={buttonOnly ? over(art, BUTTON.x, BUTTON.y, BUTTON.w, BUTTON.h + 2) : StyleSheet.absoluteFill}
        onPressIn={() => held.set(withSpring(1, motion.springs.snap))}
        onPressOut={() => held.set(withSpring(0, motion.springs.snap))}
        onPress={onButton}
        accessibilityRole="button"
        accessibilityLabel={BUTTON_LABEL[phase]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceDeep },
});
