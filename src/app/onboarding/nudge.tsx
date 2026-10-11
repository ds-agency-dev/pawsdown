import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MenuPanel } from '@/components/MenuPanel';
import { PixelButton } from '@/components/PixelButton';
import { useDisplayFont } from '@/components/PixelText';
import { Sprite } from '@/components/Sprite';
import { StepFill } from '@/components/Stepped';
import { cleanPetName } from '@/data/profile';
import { useFinishOnboarding } from '@/data/profile-store';
import { fonts, menu, palette } from '@/design/tokens';
import { coatFor, useDraft } from '@/onboarding/draft';
import { OnboardingScreen } from '@/onboarding/OnboardingScreen';
import { PetAsks } from '@/onboarding/PetAsks';
import { onboardingStyles } from '@/onboarding/styles';
import { nudgeBody, nudgeMinute, requestNudgePermission, scheduleNudges, shortClock } from '@/notifications/nudge';

const A = menu.artPt;
const DEAL = ['One nudge on workdays', 'Nothing on days off', 'No streaks, no guilt trips'];

export default function NudgeStep() {
  const [draft] = useDraft();
  const finishOnboarding = useFinishOnboarding();
  const labelFont = { fontFamily: useDisplayFont() };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Async failures reach the root ErrorBoundary instead of leaving the user stuck on a dead button.
  if (error) throw error;

  const { species } = draft;
  const name = species ? cleanPetName(draft.names[species]) : null;
  if (!species || name === null) throw new Error('Nudge step reached without a named pet');
  const coat = draft.coats[species];
  const nudgeAt = shortClock(nudgeMinute(draft.endMinute));

  const finish = async (askForNudge: boolean) => {
    setBusy(true);
    try {
      const nudge = askForNudge && (await requestNudgePermission());
      if (nudge) await scheduleNudges(name, draft.endMinute, draft.days);
      // Saving the pet flips the root guard, which replaces onboarding with the desk.
      await finishOnboarding({
        pet: { species, name, coat },
        workday: { endMinute: draft.endMinute, days: draft.days, nudge },
        switchOff: [...draft.switchOff],
      });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <OnboardingScreen
      step={4}
      footer={
        <>
          <PixelButton
            label={busy ? 'Setting up...' : 'Allow the nudge'}
            full
            pulse={!busy}
            variant={busy ? 'disabled' : 'primary'}
            onPress={() => void finish(true)}
          />
          <PixelButton label="Not now" variant={busy ? 'disabled' : 'quiet'} onPress={() => void finish(false)} />
        </>
      }>
      <PetAsks question={`Can I nudge you at ${nudgeAt}? Once a day. That's it.`} pet={{ species, coat }} />
      <MenuPanel title="Looks like this">
        <View style={styles.preview} accessible accessibilityLabel={`Notification preview: ${nudgeBody(name, draft.endMinute)}`}>
          <StepFill color="night" />
          <Sprite name={species === 'cat' ? 'cat_sit' : 'dog_sit'} coat={coatFor(species, coat)} scale={1} />
          <View style={styles.previewText}>
            <View style={styles.previewHead}>
              <Text style={styles.app}>Pawsdown</Text>
              <Text style={styles.when}>now</Text>
            </View>
            <Text style={onboardingStyles.note}>{nudgeBody(name, draft.endMinute)}</Text>
          </View>
        </View>
      </MenuPanel>
      <MenuPanel title="The deal" tone="mint">
        {DEAL.map((line) => (
          <View key={line} style={styles.dealRow}>
            <View style={styles.bullet} />
            <Text style={[styles.deal, labelFont]}>{line}</Text>
          </View>
        ))}
      </MenuPanel>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', gap: 4 * A, padding: 4 * A, alignItems: 'flex-start' },
  previewText: { flex: 1, gap: A },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between' },
  app: { fontFamily: fonts.uiBold, fontSize: 17, color: palette.paper },
  when: { fontFamily: fonts.ui, fontSize: 15, color: palette.smoke },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: 3 * A },
  bullet: { width: 3 * A, height: 3 * A, backgroundColor: palette.mint },
  deal: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: palette.paper },
});
