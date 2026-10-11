import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { color, fonts, palette } from '@/design/tokens';
import { ALL_COATS } from '@/render/bitmap';
import { DuskScene } from '@/render/DuskScene';
import { PixelSprite, PixelText } from '@/render/pixel-art';

// M1 spike screen: scene preset with sprites + bitmap text. Tap cycles pet and coat.
export default function Index() {
  const [index, setIndex] = useState(0);
  const pet = ALL_COATS[index % ALL_COATS.length];
  if (!pet) throw new Error('COATS is empty');

  return (
    <Pressable
      style={styles.container}
      onPress={() => setIndex((i) => i + 1)}
      accessibilityRole="button"
      accessibilityLabel={`Pet preview: ${pet.coat.key.replace('.', ' ')}. Tap for the next coat.`}>
      <DuskScene>
        <PixelSprite name="moon" x={104} y={16} scale={2} />
        <PixelText text="PAWSDOWN" x={68} y={52} scale={2} color={palette.glow} shadow={palette.night} align="center" />
        <PixelSprite name={pet.kind === 'cat' ? 'cat_sit' : 'dog_sit'} x={12} y={128} scale={2} coat={pet.coat} />
        <PixelSprite name="laptop_open" x={78} y={164} scale={2} />
        <PixelText text={pet.coat.key.replace('.', ' ')} x={68} y={212} color={palette.paper} shadow={palette.night} align="center" />
      </DuskScene>
      <Text style={styles.hint}>Tap for the next coat</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: color.surfaceDeep,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 17,
    color: color.ink,
    marginBottom: 48,
  },
});
