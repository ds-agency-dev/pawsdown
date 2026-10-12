import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuPanel } from '@/components/MenuPanel';
import { MenuScreen } from '@/components/MenuScreen';
import { Arrow } from '@/components/OptionCycler';
import { PixelText } from '@/components/PixelText';
import { fonts, menu, palette } from '@/design/tokens';
import { BulletList } from '@/onboarding/BulletList';

const A = menu.artPt;

// The plain-words summary. The full policy (M6) replaces the note below; keep both true to the app as built.
const ON_DEVICE = ['No account, ever', 'Everything you write stays on this phone', 'Backed up only by your own iPhone backup'];
const ANALYTICS = ['Off unless you say yes', 'Anonymous usage stats only', 'Change it any time in Settings'];

/** Reachable from anywhere (onboarding's analytics step, later Settings), so it sits outside the root guards. */
export default function Privacy() {
  const insets = useSafeAreaInsets();
  return (
    <MenuScreen>
      <View style={[styles.header, { paddingTop: insets.top + 2 * A }]}>
        <Arrow icon="prev" scale={3} label="Back" onPress={() => router.back()} />
        <View accessible accessibilityRole="header" accessibilityLabel="Privacy">
          <PixelText text="Privacy" px={menu.textPx.counter} color="lamp" shadow="night" decorative />
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 8 * A }]}>
        <MenuPanel title="Your stuff" tone="mint">
          <BulletList lines={ON_DEVICE} />
        </MenuPanel>
        <MenuPanel title="Analytics">
          <BulletList lines={ANALYTICS} bullet="lamp" />
        </MenuPanel>
        <Text style={styles.note}>The full privacy policy will live here before Pawsdown launches.</Text>
      </ScrollView>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 * A, paddingHorizontal: 6 * A },
  content: { paddingHorizontal: 8 * A, paddingTop: 6 * A, gap: 8 * A },
  note: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 22, color: palette.smoke },
});
