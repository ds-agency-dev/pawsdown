import { StyleSheet, View } from 'react-native';

import { SpeechBubble } from '@/components/SpeechBubble';
import { Sprite } from '@/components/Sprite';
import { menu } from '@/design/tokens';
import type { PetKind } from '@/render/bitmap';

import { coatFor } from './draft';

const A = menu.artPt;

interface PetAsksProps {
  readonly question: string;
  /** The picked pet in its coat; both side by side until one is picked. */
  readonly pet?: { readonly species: PetKind; readonly coat: string };
}

/** The pet (or the cat and the dog together) asking the step's question, typed out. */
export function PetAsks({ question, pet }: PetAsksProps) {
  return (
    <View style={styles.row}>
      {pet ? (
        <Sprite name={pet.species === 'cat' ? 'cat_sit' : 'dog_sit'} coat={coatFor(pet.species, pet.coat)} />
      ) : (
        <View style={styles.duo}>
          <Sprite name="cat_sit" />
          <View style={styles.overlap}>
            <Sprite name="dog_sit" />
          </View>
        </View>
      )}
      <View style={styles.bubble}>
        <SpeechBubble text={question} typing wrap={15} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 * A },
  duo: { flexDirection: 'row' },
  // The dog leans in on the cat, as in the design, so both fit beside a full bubble.
  overlap: { marginLeft: -6 * A },
  bubble: { flexShrink: 1, paddingBottom: 6 * A },
});
