import { useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PixelText } from '@/components/PixelText';
import { StepFill } from '@/components/Stepped';
import { limits } from '@/data/migrations';
import type { Pet } from '@/data/profile';
import { fonts, menu, palette } from '@/design/tokens';
import { selectFeedback } from '@/motion/feedback';

import { WIN_STARTERS } from '../copy';
import { CountAndDone, typed } from './EditorParts';
import { type LiftFrom, LiftSheet, type LiftTo } from './LiftSheet';

const A = menu.artPt;

interface WinEditorProps {
  readonly initial: string;
  readonly from: LiftFrom;
  readonly to: LiftTo;
  readonly deskTurn: SharedValue<number>;
  readonly pet: Pet;
  readonly closing: boolean;
  readonly onDone: (text: string) => void;
  readonly onClosed: () => void;
}

/** Today's win, on the ticket that gets stamped LOGGED: write it, or start from a quick starter. */
export function WinEditor({ initial, from, to, deskTurn, pet, closing, onDone, onClosed }: WinEditorProps) {
  const [text, setText] = useState(initial);
  const [poke, setPoke] = useState(0);
  const done = () => onDone(text);
  const change = (next: string) => {
    setText(next);
    setPoke((n) => n + 1);
  };

  const face = (
    <View style={styles.ticket}>
      <StepFill color="night" />
      <View style={styles.paper}>
        <StepFill color="candle" />
        <PixelText text="Win:" color="night" px={2} decorative />
        <TextInput
          style={[typed.input, styles.input]}
          value={text}
          onChangeText={change}
          maxLength={limits.winChars}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          onSubmitEditing={done}
          autoFocus
          autoCapitalize="sentences"
          placeholder="Big or small"
          placeholderTextColor={palette.plum}
          selectionColor={palette.plum}
          accessibilityLabel="Today's win"
        />
      </View>
    </View>
  );

  const below = (
    <View style={styles.below}>
      <CountAndDone used={text.length} max={limits.winChars} onDone={done} />
      <Text style={styles.stuck}>Stuck? Start with one of these</Text>
      <View style={styles.chips}>
        {WIN_STARTERS.map((starter) => (
          <Pressable
            key={starter}
            style={styles.chip}
            onPress={() => {
              selectFeedback();
              change(starter);
            }}
            accessibilityRole="button"
            accessibilityHint="Fills in the win">
            <StepFill color="night" />
            <View style={styles.chipFace}>
              <StepFill color="dusk" />
              <Text style={styles.chipText}>{starter}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <LiftSheet
      from={from}
      to={to}
      deskTurn={deskTurn}
      closing={closing}
      onClosed={onClosed}
      onDismiss={done}
      pet={pet}
      poke={poke}
      label="Today's win"
      face={face}
      below={below}
    />
  );
}

const styles = StyleSheet.create({
  ticket: { padding: A },
  paper: { padding: 4 * A, gap: 2 * A, minHeight: 26 * A },
  input: { minHeight: 52 },
  below: { gap: 3 * A },
  stuck: { fontFamily: fonts.uiBold, fontSize: 17, color: palette.parchment },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 * A },
  chip: { padding: A, minHeight: menu.minTouchPt },
  chipFace: { flex: 1, justifyContent: 'center', paddingHorizontal: 4 * A, paddingVertical: 2 * A },
  chipText: { fontFamily: fonts.ui, fontSize: 17, color: palette.paper },
});
