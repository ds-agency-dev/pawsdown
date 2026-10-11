import type { PaletteName } from '@/design/tokens';

export type ButtonVariant = 'primary' | 'quiet' | 'danger' | 'disabled';

interface VariantStyle {
  readonly face: PaletteName;
  readonly ink: PaletteName;
  /** The ledge under the face; null when the face sits flat (disabled). */
  readonly underside: PaletteName | null;
}

// Design system bundle.css/.js: danger is the only ember face and is reserved for deleting data.
export const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, VariantStyle>> = {
  primary: { face: 'lamp', ink: 'night', underside: 'ember' },
  quiet: { face: 'twilight', ink: 'paper', underside: 'night' },
  danger: { face: 'ember', ink: 'night', underside: 'plum' },
  disabled: { face: 'twilight', ink: 'smoke', underside: null },
};
