import { useMemo, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PixelButton } from '@/components/PixelButton';
import { PixelText } from '@/components/PixelText';
import { PixelToggle } from '@/components/PixelToggle';
import { StepFill } from '@/components/Stepped';
import { TextLink } from '@/components/TextLink';
import { limits } from '@/data/migrations';
import type { Pet, SwitchOff } from '@/data/profile';
import { fonts, menu, palette } from '@/design/tokens';
import { pickFeedback } from '@/motion/feedback';

import { boundaryMoves } from '../copy';
import { type LiftFrom, LiftSheet, type LiftTo } from './LiftSheet';

const A = menu.artPt;

export interface BoundaryAnswer {
  readonly text: string;
  readonly done: boolean;
}

interface BoundaryEditorProps {
  readonly initial: BoundaryAnswer;
  readonly switchOff: readonly SwitchOff[];
  readonly from: LiftFrom;
  readonly to: LiftTo;
  readonly deskTurn: SharedValue<number>;
  readonly pet: Pet;
  readonly closing: boolean;
  readonly onDone: (answer: BoundaryAnswer) => void;
  readonly onClosed: () => void;
}

/** The sticky note on the laptop: one small move that tells work it's over, and a tick once it's done. */
export function BoundaryEditor({
  initial,
  switchOff,
  from,
  to,
  deskTurn,
  pet,
  closing,
  onDone,
  onClosed,
}: BoundaryEditorProps) {
  const moves = useMemo(() => boundaryMoves(switchOff), [switchOff]);
  const [text, setText] = useState(initial.text);
  const [done, setDone] = useState(initial.done);
  const [poke, setPoke] = useState(0);
  // A saved move that isn't one of the suggestions was written by hand.
  const [own, setOwn] = useState(initial.text.length > 0 && !moves.some((m) => m.text === initial.text));
  const finish = () => onDone({ text, done: text.trim().length > 0 && done });
  const pick = (next: string) => {
    pickFeedback(next !== text);
    setText(next === text ? '' : next);
    setPoke((n) => n + 1);
  };

  const face = (
    <View style={styles.note}>
      <StepFill color="night" />
      <View style={styles.inner}>
        <StepFill color="twilight" />
        <PixelText text="One boundary move" color="paper" px={2} shadow="night" />
        <Text style={styles.sub}>Pick one small thing that tells work it&apos;s over. Then do it.</Text>
        {moves.map((move) => {
          const on = !own && move.text === text;
          return (
            <Pressable
              key={move.text}
              style={styles.row}
              onPress={() => {
                setOwn(false);
                pick(move.text);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityHint={move.why}>
              <StepFill color={on ? 'lamp' : 'night'} />
              <View style={styles.rowFace}>
                <StepFill color="dusk" />
                <Text style={[styles.move, on && styles.moveOn]}>{move.text}</Text>
                <Text style={styles.why}>{move.why}</Text>
              </View>
            </Pressable>
          );
        })}
        {own ? (
          <View style={styles.row}>
            <StepFill color="mint" />
            <View style={styles.rowFace}>
              <StepFill color="dusk" />
              <TextInput
                style={styles.ownInput}
                value={text}
                onChangeText={(next) => {
                  setText(next);
                  setPoke((n) => n + 1);
                }}
                maxLength={limits.boundaryChars}
                autoFocus={text.length === 0}
                returnKeyType="done"
                placeholder="My own move"
                placeholderTextColor={palette.smoke}
                selectionColor={palette.lamp}
                accessibilityLabel="My own boundary move"
              />
            </View>
          </View>
        ) : (
          <TextLink
            label="Write my own"
            onPress={() => {
              setOwn(true);
              setText('');
            }}
          />
        )}
        <View style={styles.doneRow}>
          <Text style={styles.doneLabel}>Done it</Text>
          <PixelToggle
            on={done}
            label="Done it"
            onToggle={() => {
              setDone((d) => !d);
              setPoke((n) => n + 1);
            }}
          />
        </View>
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
      onDismiss={finish}
      pet={pet}
      poke={poke}
      label="Boundary move"
      face={face}
      below={<PixelButton label="Done" full onPress={finish} />}
    />
  );
}

const styles = StyleSheet.create({
  note: { padding: A },
  inner: { padding: 4 * A, gap: 3 * A },
  sub: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 22, color: palette.parchment },
  row: { padding: A, minHeight: menu.minTouchPt },
  rowFace: { paddingHorizontal: 4 * A, paddingVertical: 3 * A, gap: A },
  move: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 22, color: palette.paper },
  moveOn: { fontFamily: fonts.uiBold },
  why: { fontFamily: fonts.ui, fontSize: 15, color: palette.parchment },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: menu.minTouchPt },
  doneLabel: { fontFamily: fonts.uiBold, fontSize: 17, color: palette.paper },
  ownInput: { fontFamily: fonts.uiBold, fontSize: 17, color: palette.paper, padding: 0, minHeight: 22 },
});
