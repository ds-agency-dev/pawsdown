import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceCard } from '@/components/ChoiceCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Sprite } from '@/components/Sprite';
import { Pips } from '@/components/Pips';
import { TabBar, type TabKey } from '@/components/TabBar';
import { PixelToggle } from '@/components/PixelToggle';
import { OptionCycler } from '@/components/OptionCycler';
import { MenuPanel } from '@/components/MenuPanel';
import { MenuScreen } from '@/components/MenuScreen';
import { PixelButton } from '@/components/PixelButton';
import { PixelPanel } from '@/components/PixelPanel';
import { useDisplayFont } from '@/components/PixelText';
import type { ScreenEffect, Settings } from '@/data/settings';
import { useChangeSettings, useSetting } from '@/data/settings-store';
import { color, fonts, menu, palette } from '@/design/tokens';
import { ALL_COATS } from '@/render/bitmap';

// M2 showcase: design-system components on the menu preset, to judge look and feel on device.
export default function MenuSpike() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [evenings, setEvenings] = useState(4);
  const [pet, setPet] = useState<'cat' | 'dog' | null>(null);
  const [boundary, setBoundary] = useState<number | null>(null);
  const [coat, setCoat] = useState(0);
  const [nudge, setNudge] = useState(5);
  const haptics = useSetting('haptics');
  const sound = useSetting('sound');
  const easyRead = useSetting('easyRead');
  const effect = EFFECTS.indexOf(useSetting('screenEffect'));
  const labelFont = { fontFamily: useDisplayFont() };
  const changeSettings = useChangeSettings();
  const save = (patch: Partial<Settings>) =>
    changeSettings(patch).catch((error: unknown) => console.error('Saving settings failed', error));
  const toggle = (key: 'haptics' | 'sound' | 'easyRead', on: boolean) => save({ [key]: !on });
  const stepEffect = (dir: number) => save({ screenEffect: EFFECTS[cycle(effect, dir, EFFECTS.length)] ?? 'full' });
  const [line, setLine] = useState(0);
  const [tab, setTab] = useState<TabKey>('desk');

  return (
    <MenuScreen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: 24 }]}
        style={styles.scroll}
        keyboardDismissMode="interactive">
        <MenuPanel title="Pet talk">
          <View style={styles.talkRow}>
            <Sprite name="cat_sit" coat={ALL_COATS[0]?.coat} />
            <SpeechBubble key={line} text={LINES[line % LINES.length] ?? ''} typing />
          </View>
          <View style={styles.talkColumn}>
            <SpeechBubble text="Same time tomorrow." tail="bottom" wrap={24} />
            <Sprite name="dog_sit" coat={ALL_COATS[4]?.coat} />
          </View>
          <PixelButton label="Say more" variant="quiet" onPress={() => setLine((n) => n + 1)} />
        </MenuPanel>
        <MenuPanel title="Options">
          <OptionCycler
            label="Screen effect"
            value={EFFECTS[effect] ?? ''}
            onPrev={() => stepEffect(-1)}
            onNext={() => stepEffect(1)}
          />
          <OptionCycler
            label="Coat"
            value={COAT_NAMES[coat] ?? ''}
            onPrev={() => setCoat((i) => cycle(i, -1, COAT_NAMES.length))}
            onNext={() => setCoat((i) => cycle(i, 1, COAT_NAMES.length))}
          />
          <View style={styles.toggleRow}>
            <Text style={[styles.rowLabel, labelFont]}>Haptics</Text>
            <PixelToggle label="Haptics" on={haptics} onToggle={() => toggle('haptics', haptics)} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.rowLabel, labelFont]}>Sound</Text>
            <PixelToggle label="Sound" on={sound} onToggle={() => toggle('sound', sound)} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.rowLabel, labelFont]}>Easy read</Text>
            <PixelToggle label="Easy read" on={easyRead} onToggle={() => toggle('easyRead', easyRead)} />
          </View>
          <OptionCycler
            label="Nudge time"
            size="l"
            value={`${nudge}:30`}
            onPrev={() => setNudge((h) => cycle(h - 1, -1, 12) + 1)}
            onNext={() => setNudge((h) => cycle(h - 1, 1, 12) + 1)}
          />
        </MenuPanel>
        <MenuPanel title="Pick a pet">
          <View style={styles.row}>
            <View style={styles.cell}>
              <ChoiceCard
                title="Cat"
                caption="Naps on your keyboard."
                sprite="cat_sit"
                coat={ALL_COATS[0]?.coat}
                index={0}
                selected={pet === 'cat'}
                onSelect={() => setPet('cat')}
              />
            </View>
            <View style={styles.cell}>
              <ChoiceCard
                title="Dog"
                caption="Waits by the door."
                sprite="dog_sit"
                coat={ALL_COATS[4]?.coat}
                index={1}
                selected={pet === 'dog'}
                onSelect={() => setPet('dog')}
              />
            </View>
          </View>
        </MenuPanel>
        <MenuPanel title="Boundary move">
          <View style={styles.row}>
            {['Phone away', 'Close tabs', 'Walk out'].map((title, i) => (
              <View key={title} style={styles.cell}>
                <ChoiceCard
                  title={title}
                  index={i}
                  wrap={6}
                  selected={boundary === i}
                  onSelect={() => setBoundary(i)}
                />
              </View>
            ))}
          </View>
        </MenuPanel>
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
        <MenuPanel title="Episode 2">
          <Text style={[styles.rowLabel, labelFont]}>{`Panel ${Math.min(evenings, 5)} of 5`}</Text>
          <Pips total={5} filled={Math.min(evenings, 5)} />
          <Pips total={12} filled={2} size={2 * menu.artPt} />
          <PixelButton label="Reset panels" variant="quiet" onPress={() => setEvenings(0)} />
        </MenuPanel>
        <PixelPanel
          title="Tonight"
          rows={[
            { label: 'Evenings clocked out', value: evenings },
            { label: 'Panels', value: '3/5' },
          ]}
        />
      </ScrollView>
      <TabBar active={tab} onSelect={setTab} />
    </MenuScreen>
  );
}

const LINES = [
  'What are the three things for tomorrow?',
  'Good. Now one win from today.',
  'Laptop closed. I will keep watch.',
];
const EFFECTS: readonly ScreenEffect[] = ['full', 'soft', 'off'];
const COAT_NAMES = ALL_COATS.map(({ coat }) => coat.key.split('.')[1] ?? coat.key);

function cycle(i: number, step: number, length: number): number {
  return (i + step + length) % length;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 24 },
  // Room above for the lift and the PICKED stamp.
  row: {
    flexDirection: 'row',
    gap: 3 * menu.artPt,
    paddingTop: 9 * menu.artPt,
  },
  cell: { flex: 1 },
  talkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 * menu.artPt },
  talkColumn: { gap: 6 * menu.artPt, paddingBottom: menu.artPt },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: palette.paper },
  input: {
    fontFamily: fonts.ui,
    fontSize: 17,
    color: color.ink,
    backgroundColor: color.surfaceDeep,
    padding: 12,
  },
});
