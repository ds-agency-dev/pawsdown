import { StyleSheet, Text, View } from 'react-native';

import { useDisplayFont } from '@/components/PixelText';
import { fonts, menu, palette, type PaletteName } from '@/design/tokens';

const A = menu.artPt;

/** Short one-line promises inside a MenuPanel, each behind a square pixel bullet. */
export function BulletList({ lines, bullet = 'mint' }: { readonly lines: readonly string[]; readonly bullet?: PaletteName }) {
  const labelFont = { fontFamily: useDisplayFont() };
  return lines.map((line) => (
    <View key={line} style={styles.row}>
      <View style={[styles.bullet, { backgroundColor: palette[bullet] }]} />
      <Text style={[styles.line, labelFont]}>{line}</Text>
    </View>
  ));
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 * A },
  bullet: { width: 3 * A, height: 3 * A },
  line: { flex: 1, fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: palette.paper },
});
