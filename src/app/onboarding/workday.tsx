import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { MenuPanel } from '@/components/MenuPanel';
import { OptionCycler } from '@/components/OptionCycler';
import { PixelButton } from '@/components/PixelButton';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { MINUTES_PER_DAY, STEP_MINUTES } from '@/data/profile';
import { useDraft } from '@/onboarding/draft';
import { OnboardingScreen } from '@/onboarding/OnboardingScreen';
import { onboardingStyles } from '@/onboarding/styles';
import { PetAsks } from '@/onboarding/PetAsks';
import { clockLabel } from '@/notifications/nudge';

export default function WorkdayStep() {
  const [draft, setDraft] = useDraft();
  const stepTime = (dir: number) =>
    setDraft((d) => ({ ...d, endMinute: (d.endMinute + dir * STEP_MINUTES + MINUTES_PER_DAY) % MINUTES_PER_DAY }));

  return (
    <OnboardingScreen
      step={1}
      footer={<PixelButton label="Next" full onPress={() => router.push('/onboarding/switch-off')} />}>
      <PetAsks question="When does your workday usually end?" />
      <MenuPanel title="Clock out at">
        <OptionCycler
          label="Clock out at"
          size="l"
          value={clockLabel(draft.endMinute)}
          onPrev={() => stepTime(-1)}
          onNext={() => stepTime(1)}
        />
        <Text style={[onboardingStyles.note, styles.center]}>
          Steps of 15 minutes. I start getting ready a little before.
        </Text>
      </MenuPanel>
      <MenuPanel title="On these days" tone="mint">
        <WeekdayPicker days={draft.days} onChange={(days) => setDraft((d) => ({ ...d, days }))} />
        <Text style={onboardingStyles.note}>On days off the desk closes and nothing nags you.</Text>
      </MenuPanel>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
