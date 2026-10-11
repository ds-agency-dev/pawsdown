import { Stack } from 'expo-router';

import { color } from '@/design/tokens';
import { DraftProvider } from '@/onboarding/draft';

export default function OnboardingLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surfaceDeep } }} />
    </DraftProvider>
  );
}
