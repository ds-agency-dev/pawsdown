import { StyleSheet, View } from 'react-native';

import { WEEKDAYS } from '@/onboarding/copy';

import { PixelButton } from './PixelButton';

interface WeekdayPickerProps {
  /** Bitmask, bit 0 = Sunday. */
  readonly days: number;
  readonly onChange: (days: number) => void;
}

/** Seven key caps, Monday first. The last workday can't be switched off: a desk that never opens has no use. */
export function WeekdayPicker({ days, onChange }: WeekdayPickerProps) {
  return (
    <View style={styles.row} accessibilityRole="list">
      {WEEKDAYS.map(({ key, name, bit }) => {
        const on = (days & (1 << bit)) !== 0;
        const next = days ^ (1 << bit);
        return (
          <PixelButton
            key={name}
            label={key}
            size="s"
            variant={on ? 'primary' : 'quiet'}
            selected={on}
            accessibilityLabel={name}
            onPress={() => {
              if (next !== 0) onChange(next);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
