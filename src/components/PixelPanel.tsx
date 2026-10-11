import { StyleSheet, View } from 'react-native';

import { menu } from '@/design/tokens';

import { PixelText } from './PixelText';
import { Stepped } from './Stepped';

const A = menu.artPt;

interface PixelPanelRow {
  readonly label: string;
  readonly value: string | number;
}

interface PixelPanelProps {
  readonly title?: string;
  /** With rows it is the tally. Count evenings clocked out, never a streak. Labels must be unique. */
  readonly rows?: readonly PixelPanelRow[];
}

/** A raised twilight panel with a night outline. */
export function PixelPanel({ title, rows = [] }: PixelPanelProps) {
  return (
    <Stepped color="night" style={styles.outline}>
      <Stepped color="twilight" style={styles.face}>
        {title && (
          <View accessible accessibilityRole="header" accessibilityLabel={title}>
            <PixelText text={title} px={menu.textPx.label} color="parchment" shadow="night" decorative />
          </View>
        )}
        {rows.map((row) => (
          <View key={row.label} style={styles.row} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
            <PixelText text={row.label} px={menu.textPx.label} color="parchment" decorative />
            <PixelText text={String(row.value)} px={menu.textPx.counter} color="glow" decorative />
          </View>
        ))}
      </Stepped>
    </Stepped>
  );
}

const styles = StyleSheet.create({
  outline: { width: 107 * A, maxWidth: '100%', padding: A },
  face: { padding: 5 * A, gap: 5 * A },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 * A },
});
