import { playSound } from '@/audio/sounds';

import { selectHaptic, tapHaptic } from './haptics';

// Every interaction's feedback in one place, so motion, haptics and sound stay paired across components.

/** Button press. */
export function tapFeedback() {
  tapHaptic();
  playSound('tap');
}

/** Stepping through options or switching tabs. */
export function selectFeedback() {
  selectHaptic();
  playSound('tick');
}

/** Pressing a card; `stamps` when the press makes it the pick (the PICKED thump is mixed into that sound). */
export function pickFeedback(stamps: boolean) {
  tapHaptic();
  playSound(stamps ? 'pickStamp' : 'pick');
}

/** A toggle flipping to `on`. */
export function toggleFeedback(on: boolean) {
  tapHaptic();
  playSound(on ? 'toggleOn' : 'toggleOff');
}

/** The pet typing a character. Sound only: a haptic per character would buzz. */
export function typeFeedback() {
  playSound('blip');
}
