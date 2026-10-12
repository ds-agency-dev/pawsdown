import { StyleSheet, Text, View } from 'react-native';

import { PixelButton } from '@/components/PixelButton';
import { fonts, menu, palette } from '@/design/tokens';

const A = menu.artPt;

/** Characters used against the limit, then the editor's Done. */
export function CountAndDone({ used, max, onDone }: { used: number; max: number; onDone: () => void }) {
  const left = max - used;
  return (
    <View style={styles.row}>
      <Text
        style={[styles.count, left <= 5 && styles.countLow]}
        accessibilityLabel={`${left} characters left`}
        accessibilityLiveRegion="polite">
        {used} / {max}
      </Text>
      <PixelButton label="Done" onPress={onDone} />
    </View>
  );
}

/** Typed text is Atkinson (readable, ≥17pt); pixel fonts stay for labels. */
export const typed = StyleSheet.create({
  input: {
    fontFamily: fonts.uiBold,
    fontSize: 20,
    lineHeight: 26,
    color: palette.night,
    padding: 0,
  },
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 * A },
  count: { fontFamily: fonts.ui, fontSize: 17, color: palette.parchment },
  countLow: { color: palette.lamp },
});
