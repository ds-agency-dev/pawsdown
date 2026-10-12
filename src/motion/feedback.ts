import { playSound, type SoundName } from '@/audio/sounds';

import { selectHaptic, tapHaptic, thudHaptic } from './haptics';

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

/** The welcome CRT warming up; its thunk lands `menu.powerOn.thunkMs` in, where `thudFeedback` pairs with it. */
export function powerOnFeedback() {
  playSound('powerOn');
}

/** The picture snapping open (haptic only: the power-on sound already carries the thunk). */
export function thudFeedback() {
  thudHaptic();
}

/** A desk object turning over as it's lifted to edit or set back down. */
export function flipFeedback() {
  selectHaptic();
  playSound('flick');
}

/** Shutdown beats: what each one sounds and feels like. Counting ticks are sound only (a buzz per digit is too much). */
const BEATS = {
  cardFlip: { sound: 'flick', haptic: selectHaptic },
  cardDrop: { sound: 'cardDrop', haptic: tapHaptic },
  drawerShut: { sound: 'drawerShut', haptic: thudHaptic },
  stamp: { sound: 'stamp', haptic: thudHaptic },
  tallyIn: { sound: 'tallyIn', haptic: null },
  count: { sound: 'count', haptic: null },
  countPop: { sound: 'countPop', haptic: selectHaptic },
  lightsOut: { sound: 'lightsOut', haptic: thudHaptic },
  reward: { sound: 'reward', haptic: tapHaptic },
} as const satisfies Record<string, { sound: SoundName; haptic: (() => void) | null }>;

export type BeatCue = keyof typeof BEATS;

export function beatFeedback(cue: BeatCue) {
  const beat = BEATS[cue];
  beat.haptic?.();
  playSound(beat.sound);
}

/** A beat landing, e.g. the welcome title's last letter. Haptic only, so it sits under the typing blips. */
export function landFeedback() {
  tapHaptic();
}
