// Pixel icons from the design system (bundle.js ICONS), in sprites.json color codes; 'o' is the night outline.
export const ICONS = {
  desk: [
    '.........',
    '.ooooooo.',
    '.okkkkko.',
    '.okkkkko.',
    '.okkkkko.',
    '.ooooooo.',
    'ooooooooo',
    'occccccco',
    'ooooooooo',
  ],
  episodes: [
    'ooooooooo',
    'occcoccco',
    'ocucoceco',
    'occcoccco',
    'ooooooooo',
    'occcoccco',
    'ocycocuco',
    'occcoccco',
    'ooooooooo',
  ],
  room: [
    '.........',
    '.ooooooo.',
    '.ouuuuuo.',
    'ooouuuooo',
    'ouoooooou',
    'ouuuuuuuo',
    'ooooooooo',
    '.o.....o.',
    '.........',
  ],
  settings: [
    '...ooo...',
    '.o.ogo.o.',
    '.ooggggo.',
    'oggoooggo',
    'ogo...ogo',
    'oggoooggo',
    '.ooggggo.',
    '.o.ogo.o.',
    '...ooo...',
  ],
  next: ['oo....', 'ogo...', 'oggo..', 'ogggo.', 'oggggo', 'ogggo.', 'oggo..', 'ogo...', 'oo....'],
  prev: ['....oo', '...ogo', '..oggo', '.ogggo', 'oggggo', '.ogggo', '..oggo', '...ogo', '....oo'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;

/** Outline code; a tint recolors every other pixel. */
export const ICON_OUTLINE = 'o';
