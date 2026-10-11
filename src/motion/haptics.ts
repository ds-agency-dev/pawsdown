import * as Haptics from 'expo-haptics';

// Haptics are a garnish: a failure (e.g. unsupported hardware) must never break the press, but we still want
// to hear about it in development.
function report(error: unknown) {
  if (__DEV__) console.warn('Haptic feedback failed', error);
}

// Mirrors the Haptics setting (settings store).
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

/** Light tick for button presses (design system: "light haptic"). */
export function tapHaptic() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(report);
}

/** Selection tick for switching between options, e.g. tabs. */
export function selectHaptic() {
  if (!enabled) return;
  Haptics.selectionAsync().catch(report);
}
