import { useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { StyleSheet, TextInput, View } from 'react-native';

import { PixelText } from '@/components/PixelText';
import { StepFill } from '@/components/Stepped';
import { limits } from '@/data/migrations';
import type { Pet } from '@/data/profile';
import { menu, palette } from '@/design/tokens';

import { CountAndDone, typed } from './EditorParts';
import { type LiftFrom, LiftSheet, type LiftTo } from './LiftSheet';

const A = menu.artPt;

const PROMPTS = ["What's first tomorrow?", 'And second?', 'One more?'] as const;

interface CardEditorProps {
  /** Slot 0..2. */
  readonly slot: number;
  readonly initial: string;
  readonly from: LiftFrom;
  readonly to: LiftTo;
  readonly deskTurn: SharedValue<number>;
  /** The card's height at `to.w` (keeps the desk card's 3:4 shape, fitted above the keyboard). */
  readonly height: number;
  readonly pet: Pet;
  readonly closing: boolean;
  /** Done or tap outside, with the text as typed (the owner trims and saves it). */
  readonly onDone: (text: string) => void;
  readonly onClosed: () => void;
}

/** One of tomorrow's cards, lifted off the desk to write on: paper face, its number, and the pet watching. */
export function CardEditor({
  slot,
  initial,
  from,
  to,
  deskTurn,
  height,
  pet,
  closing,
  onDone,
  onClosed,
}: CardEditorProps) {
  const [text, setText] = useState(initial);
  const [poke, setPoke] = useState(0);
  const done = () => onDone(text);

  const face = (
    <View style={[styles.card, { height }]}>
      <StepFill color="night" />
      <View style={styles.paper}>
        <StepFill color="paper" />
        <View style={styles.head}>
          <PixelText text={`No.${slot + 1}`} color="plum" px={2} decorative />
          <View style={styles.pin}>
            <StepFill color="lamp" />
          </View>
        </View>
        <View style={styles.rule} />
        <TextInput
          style={[typed.input, styles.input]}
          value={text}
          onChangeText={(next) => {
            setText(next);
            setPoke((n) => n + 1);
          }}
          maxLength={limits.cardChars}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          onSubmitEditing={done}
          autoFocus
          autoCapitalize="sentences"
          placeholder={PROMPTS[slot] ?? PROMPTS[0]}
          placeholderTextColor={palette.smoke}
          selectionColor={palette.plum}
          accessibilityLabel={`Card ${slot + 1} for tomorrow`}
        />
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
      label={`Card ${slot + 1}`}
      face={face}
      below={<CountAndDone used={text.length} max={limits.cardChars} onDone={done} />}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: A },
  paper: { flex: 1, padding: 4 * A },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pin: { width: 3 * A, height: 3 * A },
  rule: { height: A, backgroundColor: palette.parchment, marginVertical: 3 * A },
  input: { flex: 1, textAlignVertical: 'top' },
});
