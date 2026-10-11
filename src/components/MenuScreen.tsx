import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSetting } from '@/data/settings-store';
import { color, menuSwirlDim } from '@/design/tokens';
import { CrtOverlay } from '@/render/CrtOverlay';
import { Swirl } from '@/render/swirl';

/**
 * Menu preset: dimmed swirl behind, scanlines + vignette + tube edge in front, RN UI in between.
 * Screen effect Soft drops the tube edge; Off is a flat surface with no swirl or overlay.
 */
export function MenuScreen({ children }: { readonly children: ReactNode }) {
  const effect = useSetting('screenEffect');
  if (effect === 'off') return <View style={[styles.root, styles.flat]}>{children}</View>;
  return (
    <View style={styles.root}>
      <Swirl dim={menuSwirlDim} />
      {children}
      <CrtOverlay preset={effect === 'soft' ? 'flat' : 'menu'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceDeep },
  flat: { backgroundColor: color.surface },
});
