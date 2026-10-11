import * as Haptics from 'expo-haptics';

// Haptics are a garnish: a failure (e.g. unsupported hardware) must never break the press, but we still want
// to hear about it in development.
function report(error: unknown) {
  if (__DEV__) console.warn('Haptic feedback failed', error);
}

/** Light tick for button presses (design system: "light haptic"). */
export function tapHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(report);
}
