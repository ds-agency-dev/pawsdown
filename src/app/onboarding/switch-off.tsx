import { router } from 'expo-router';
import { View } from 'react-native';

import { ChoiceCard } from '@/components/ChoiceCard';
import { PixelButton } from '@/components/PixelButton';
import { SWITCH_OFF, type SwitchOff } from '@/data/profile';
import { SWITCH_OFF_COPY } from '@/onboarding/copy';
import { useDraft } from '@/onboarding/draft';
import { OnboardingScreen } from '@/onboarding/OnboardingScreen';
import { PetAsks } from '@/onboarding/PetAsks';
import { onboardingStyles } from '@/onboarding/styles';

// Two a row, in the design's order.
const ROWS: readonly (readonly SwitchOff[])[] = [SWITCH_OFF.slice(0, 2), SWITCH_OFF.slice(2, 4), SWITCH_OFF.slice(4, 6)];

export default function SwitchOffStep() {
  const [draft, setDraft] = useDraft();
  const toggle = (topic: SwitchOff) =>
    setDraft((d) => ({
      ...d,
      switchOff: d.switchOff.includes(topic) ? d.switchOff.filter((t) => t !== topic) : [...d.switchOff, topic],
    }));

  return (
    <OnboardingScreen
      step={2}
      footer={<PixelButton label="Next" full onPress={() => router.push('/onboarding/pet')} />}>
      <PetAsks question="What's hardest to switch off? Pick any." />
      <View>
        {ROWS.map((row, r) => (
          <View key={row.join()} style={onboardingStyles.cardRow}>
            {row.map((topic, i) => (
              <View key={topic} style={onboardingStyles.cardCell}>
                <ChoiceCard
                  title={SWITCH_OFF_COPY[topic].title}
                  caption={SWITCH_OFF_COPY[topic].caption}
                  index={r * 2 + i}
                  wrap={10}
                  selected={draft.switchOff.includes(topic)}
                  onSelect={() => toggle(topic)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
