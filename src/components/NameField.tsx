import { StyleSheet, TextInput, View } from 'react-native';

import { color, fonts, menu, palette } from '@/design/tokens';

import { StepFill } from './Stepped';

const A = menu.artPt;

interface NameFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly maxLength: number;
  /** Spoken label, e.g. "Your cat's name". */
  readonly label: string;
}

/** A one-line text box: night outline, mint frame (it's the thing to fill in), dusk well with paper text. */
export function NameField({ value, onChange, maxLength, label }: NameFieldProps) {
  return (
    <View style={styles.frame}>
      <StepFill color="night" />
      <View style={styles.ring}>
        <StepFill color="mint" />
        <View style={styles.well}>
          <StepFill color="dusk" />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            maxLength={maxLength}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            selectionColor={palette.lamp}
            accessibilityLabel={label}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, padding: A },
  ring: { padding: A },
  well: { minHeight: menu.minTouchPt },
  input: {
    fontFamily: fonts.uiBold,
    fontSize: 20,
    color: color.ink,
    paddingHorizontal: 4 * A,
    paddingVertical: 3 * A,
  },
});
