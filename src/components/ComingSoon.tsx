import { StyleSheet, Text, View } from 'react-native';

import { fonts, menu, palette } from '@/design/tokens';

import { MenuScreen } from './MenuScreen';
import { PixelText } from './PixelText';

const A = menu.artPt;

/** Placeholder for tabs whose screens land in later milestones (Episodes and Room in M5, Settings in M6). */
export function ComingSoon({ title }: { readonly title: string }) {
  return (
    <MenuScreen>
      <View style={styles.root}>
        <View accessible accessibilityRole="header" accessibilityLabel={title}>
          <PixelText text={title} px={menu.textPx.counter} color="lamp" shadow="night" decorative />
        </View>
        <Text style={styles.note}>Coming soon.</Text>
      </View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 * A },
  note: { fontFamily: fonts.ui, fontSize: 17, color: palette.smoke },
});
