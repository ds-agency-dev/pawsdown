import { router } from 'expo-router';

import { MenuPanel } from '@/components/MenuPanel';
import { PixelButton } from '@/components/PixelButton';
import { BulletList } from '@/onboarding/BulletList';
import { useDraft } from '@/onboarding/draft';
import { OnboardingScreen } from '@/onboarding/OnboardingScreen';
import { PetAsks } from '@/onboarding/PetAsks';

// Must stay true to what the analytics client actually sends (and to the App Privacy label).
const SHARED = ['Which screens get opened', 'Whether clock-outs finish', 'Crashes, device and app version'];
const NEVER = ['Your cards, wins or notes', "Your pet's name", 'Anything that identifies you'];

/** Opt-in for anonymous usage analytics. Both answers move on and weigh the same: no nudging toward yes. */
export default function AnalyticsStep() {
  const [draft, setDraft] = useDraft();
  const { species } = draft;
  if (!species) throw new Error('Analytics step reached without a pet');

  const answer = (analytics: boolean) => {
    setDraft((d) => ({ ...d, analytics }));
    router.push('/onboarding/nudge');
  };

  return (
    <OnboardingScreen
      step={4}
      footer={
        <>
          <PixelButton label="Share usage stats" full onPress={() => answer(true)} />
          <PixelButton label="Don't share" full variant="quiet" onPress={() => answer(false)} />
        </>
      }>
      <PetAsks
        question="Can I send anonymous usage analytics to help improve Pawsdown? Only if you say yes. You can change it in Settings."
        pet={{ species, coat: draft.coats[species] }}
      />
      <MenuPanel title="What gets shared">
        <BulletList lines={SHARED} bullet="lamp" />
      </MenuPanel>
      <MenuPanel title="Never shared" tone="mint">
        <BulletList lines={NEVER} />
      </MenuPanel>
    </OnboardingScreen>
  );
}
