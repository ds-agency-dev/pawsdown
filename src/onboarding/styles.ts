import { StyleSheet } from 'react-native';

import { fonts, menu, palette } from '@/design/tokens';

const A = menu.artPt;

export const onboardingStyles = StyleSheet.create({
  /** Plain-words help under a control. */
  note: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 22, color: palette.parchment },
  /** Two cards a row, with room above for the lift and the PICKED stamp. */
  cardRow: { flexDirection: 'row', gap: 3 * A, paddingTop: 9 * A },
  cardCell: { flex: 1 },
});
