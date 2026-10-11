import { StyleSheet, View, type ViewProps } from 'react-native';

import { menu, palette, type PaletteName } from '@/design/tokens';

interface StepFillProps {
  readonly color: PaletteName;
  /** Notch size in points. Default one menu art px. */
  readonly step?: number;
}

/**
 * Fills its parent with a rectangle notched one step at each corner. RN has no clip-path, so it is the union
 * of two rects: one inset left/right, one inset top/bottom. The corners stay transparent over the swirl.
 */
export function StepFill({ color, step = menu.artPt }: StepFillProps) {
  const backgroundColor = palette[color];
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: step, right: step, backgroundColor }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: step, bottom: step, backgroundColor }]} />
    </>
  );
}

type SteppedProps = StepFillProps & ViewProps;

/** A view with a stepped-corner background; the building block of every pixel surface. */
export function Stepped({ color, step, children, ...rest }: SteppedProps) {
  return (
    <View {...rest}>
      <StepFill color={color} step={step} />
      {children}
    </View>
  );
}
