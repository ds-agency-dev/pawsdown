import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, menuSwirlDim } from '@/design/tokens';
import { CrtOverlay } from '@/render/CrtOverlay';
import { Swirl } from '@/render/swirl';

/** Menu preset: dimmed swirl behind, scanlines + vignette + tube edge in front, RN UI in between. */
export function MenuScreen({ children }: { readonly children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Swirl dim={menuSwirlDim} />
      {children}
      <CrtOverlay preset="menu" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceDeep },
});
