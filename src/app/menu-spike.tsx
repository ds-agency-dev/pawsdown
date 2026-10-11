import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuPanel } from '@/components/MenuPanel';
import { MenuScreen } from '@/components/MenuScreen';
import { PixelButton } from '@/components/PixelButton';
import { PixelPanel } from '@/components/PixelPanel';
import { color, fonts, palette } from '@/design/tokens';

// M2 showcase: design-system components on the menu preset, to judge look and feel on device.
export default function MenuSpike() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [evenings, setEvenings] = useState(4);

  return (
    <MenuScreen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardDismissMode="interactive">
        <MenuPanel title="Buttons" float>
          <PixelButton label="Clock out" pulse full onPress={() => setEvenings((n) => n + 1)} />
          <PixelButton label="See you tomorrow" variant="quiet" />
          <PixelButton label="Shut down" pressed />
          <PixelButton label="Mon" size="s" />
          <PixelButton label="Clocking out..." variant="disabled" />
        </MenuPanel>
        <MenuPanel title="Danger zone" tone="ember" float delay={800}>
          <PixelButton label="Delete everything" variant="danger" full />
        </MenuPanel>
        <MenuPanel title="Quiet group" tone="heather">
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type here to test input lag"
            placeholderTextColor={palette.smoke}
            maxLength={60}
            accessibilityLabel="Test input"
          />
        </MenuPanel>
        <PixelPanel
          title="Tonight"
          rows={[
            { label: 'Evenings clocked out', value: evenings },
            { label: 'Panels', value: '3/5' },
          ]}
        />
      </ScrollView>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 24 },
  input: {
    fontFamily: fonts.ui,
    fontSize: 17,
    color: color.ink,
    backgroundColor: color.surfaceDeep,
    padding: 12,
  },
});
