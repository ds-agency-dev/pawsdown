import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ChoiceCard } from '@/components/ChoiceCard';
import { MenuPanel } from '@/components/MenuPanel';
import { NameField } from '@/components/NameField';
import { OptionCycler } from '@/components/OptionCycler';
import { useDisplayFont } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { SpeechBubble } from '@/components/SpeechBubble';
import { cleanPetName } from '@/data/profile';
import { fonts, menu, palette } from '@/design/tokens';
import { limits } from '@/data/migrations';
import { COATS, type PetKind } from '@/render/bitmap';
import { COAT_NAMES, SPECIES_COPY } from '@/onboarding/copy';
import { coatFor, useDraft } from '@/onboarding/draft';
import { OnboardingScreen } from '@/onboarding/OnboardingScreen';
import { onboardingStyles } from '@/onboarding/styles';

const A = menu.artPt;
const SPECIES: readonly PetKind[] = ['cat', 'dog'];

export default function PetStep() {
  const [draft, setDraft] = useDraft();
  const labelFont = { fontFamily: useDisplayFont() };
  const { species } = draft;
  const ready = species !== null && cleanPetName(draft.names[species]) !== null;

  const stepCoat = (kind: PetKind, dir: number) => {
    const keys = Object.keys(COATS[kind]);
    const at = keys.indexOf(draft.coats[kind]);
    const next = keys[(at + dir + keys.length) % keys.length] ?? draft.coats[kind];
    setDraft((d) => ({ ...d, coats: { ...d.coats, [kind]: next } }));
  };

  return (
    <OnboardingScreen
      step={3}
      footer={
        <PixelButton
          label="That's me"
          full
          variant={ready ? 'primary' : 'disabled'}
          onPress={() => router.push('/onboarding/analytics')}
        />
      }>
      <SpeechBubble text="Cat or dog? Pick one of us, then give me a name." typing tail="bottom" wrap={24} />
      <View style={onboardingStyles.cardRow}>
        {SPECIES.map((kind, i) => (
          <View key={kind} style={onboardingStyles.cardCell}>
            <ChoiceCard
              title={SPECIES_COPY[kind].title}
              caption={SPECIES_COPY[kind].caption}
              sprite={kind === 'cat' ? 'cat_sit' : 'dog_sit'}
              coat={coatFor(kind, draft.coats[kind])}
              index={i}
              selected={species === kind}
              onSelect={() => setDraft((d) => ({ ...d, species: kind }))}
            />
          </View>
        ))}
      </View>
      {species && (
        <MenuPanel title={`Your ${species}`}>
          <OptionCycler
            label="Coat"
            value={(COAT_NAMES[species] as Readonly<Record<string, string>>)[draft.coats[species]] ?? ''}
            onPrev={() => stepCoat(species, -1)}
            onNext={() => stepCoat(species, 1)}
          />
          <View style={styles.nameRow}>
            <Text style={[styles.label, labelFont]} importantForAccessibility="no" accessibilityElementsHidden>
              Name
            </Text>
            <NameField
              label={`Your ${species}'s name`}
              value={draft.names[species]}
              maxLength={limits.petNameChars}
              onChange={(name) => setDraft((d) => ({ ...d, names: { ...d.names, [species]: name } }))}
            />
          </View>
          <Text style={onboardingStyles.note}>
            You can change the coat later. Episodes, outfits and the room work the same for both.
          </Text>
        </MenuPanel>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 * A },
  label: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: palette.paper },
});
