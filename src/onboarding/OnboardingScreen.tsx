import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from '@/components/MenuScreen';
import { Arrow } from '@/components/OptionCycler';
import { Pips } from '@/components/Pips';
import { PixelText } from '@/components/PixelText';
import { menu } from '@/design/tokens';

const A = menu.artPt;
export const ONBOARDING_STEPS = 5;

interface OnboardingScreenProps {
  readonly step: number;
  /** The screen's actions, pinned under the scrolling content. */
  readonly footer: ReactNode;
  readonly children: ReactNode;
}

/** One onboarding step: back key, step count and pips on top, the pet's question and panels, actions at the bottom. */
export function OnboardingScreen({ step, footer, children }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <MenuScreen>
      <View style={[styles.header, { paddingTop: insets.top + 2 * A }]}>
        <Arrow icon="prev" scale={3} label="Back" onPress={() => router.back()} />
        <View style={styles.step} accessible accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}>
          <PixelText text={`Step ${step}/${ONBOARDING_STEPS}`} px={menu.textPx.label} color="paper" shadow="night" decorative />
          <Pips total={ONBOARDING_STEPS} filled={step} size={2 * A} />
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 4 * A }]}>{footer}</View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6 * A,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 3 * A },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 8 * A, paddingTop: 4 * A, paddingBottom: 8 * A, gap: 8 * A },
  footer: { paddingHorizontal: 8 * A, paddingTop: 4 * A, gap: 2 * A, alignItems: 'center' },
});
