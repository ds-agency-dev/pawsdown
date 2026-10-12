import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, menu, palette } from '@/design/tokens';
import { selectFeedback } from '@/motion/feedback';

/** A quiet underlined link for secondary actions under a screen's buttons (e.g. "Read the privacy policy"). */
export function TextLink({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        selectFeedback();
        onPress();
      }}
      hitSlop={(menu.minTouchPt - 22) / 2}
      style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.ui,
    fontSize: 17,
    lineHeight: 22,
    color: palette.sky,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.6 },
});
