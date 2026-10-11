import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { menu, type PaletteName } from '@/design/tokens';
import { useFloat } from '@/motion/float';

import { PixelText } from './PixelText';
import { Stepped } from './Stepped';

const A = menu.artPt;

type MenuTone = Extract<PaletteName, 'lamp' | 'mint' | 'glow' | 'ember' | 'heather' | 'plum'>;

interface MenuPanelProps {
  /** Ribbon title, two or three words. */
  readonly title?: string;
  /** lamp by default, mint for on/done, ember only for the danger zone, heather for quiet groups. */
  readonly tone?: MenuTone;
  /** Glide 1 art px up and back over 3.2 s. Stagger neighbours with `delay` so they never move together. */
  readonly float?: boolean;
  readonly delay?: number;
  readonly children?: ReactNode;
}

/** Chunky panel with a ribbon title and a dark ledge: the building block of every menu screen. */
export function MenuPanel({ title, tone = 'lamp', float = false, delay = 0, children }: MenuPanelProps) {
  const lift = useFloat(float, menu.float.halfPeriodMs, delay);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * menu.float.liftPt }] }));
  const ink = tone === 'heather' || tone === 'plum' ? 'paper' : 'night';

  return (
    <Animated.View style={[styles.root, floatStyle]}>
      {title && (
        <Stepped color="night" style={styles.ribbon} accessible accessibilityRole="header" accessibilityLabel={title}>
          <Stepped color={tone} style={styles.ribbonFace}>
            <PixelText text={title} px={menu.textPx.label} color={ink} decorative />
          </Stepped>
        </Stepped>
      )}
      <Stepped color="night" style={styles.body}>
        <Stepped color="twilight" style={styles.face}>
          {children}
        </Stepped>
      </Stepped>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 4 * A },
  ribbon: { position: 'absolute', left: 4 * A, top: 0, zIndex: 2, padding: A },
  ribbonFace: { paddingVertical: 2 * A, paddingHorizontal: 3 * A },
  body: { paddingTop: A, paddingHorizontal: A, paddingBottom: 3 * A },
  face: { paddingTop: 7 * A, paddingHorizontal: 5 * A, paddingBottom: 5 * A, gap: 4 * A },
});

