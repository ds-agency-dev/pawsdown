import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from '@/components/MenuScreen';
import { color, fonts, palette } from '@/design/tokens';

const ROWS = Array.from({ length: 40 }, (_, i) => `Row ${i + 1}: scroll me to check the overlay stays smooth.`);

// M1 spike: menu preset over a long scroll + a text field, to check scroll/typing perf and text sharpness.
export default function MenuSpike() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  return (
    <MenuScreen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardDismissMode="interactive">
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type here to test input lag"
          placeholderTextColor={palette.smoke}
          maxLength={60}
          accessibilityLabel="Test input"
        />
        {ROWS.map((row) => (
          <Text key={row} style={styles.row}>
            {row}
          </Text>
        ))}
      </ScrollView>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 12 },
  input: {
    fontFamily: fonts.ui,
    fontSize: 17,
    color: color.ink,
    backgroundColor: color.surfaceRaised,
    padding: 12,
  },
  row: { fontFamily: fonts.ui, fontSize: 17, color: color.ink },
});
