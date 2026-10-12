import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { preloadSounds } from '@/audio/sounds';
import { DATABASE_NAME, initDatabase } from '@/data/db';
import { useOnboarded } from '@/data/profile-store';
import { color, fonts } from '@/design/tokens';

export { ErrorBoundary } from 'expo-router';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.ui]: require('@/assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
    [fonts.uiBold]: require('@/assets/fonts/AtkinsonHyperlegible-Bold.ttf'),
    [fonts.display]: require('@/assets/fonts/PixelifySans-Regular.ttf'),
    [fonts.displayBold]: require('@/assets/fonts/PixelifySans-Bold.ttf'),
  });

  useEffect(preloadSounds, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hide();
  }, [fontsLoaded, fontError]);

  // Surfaces in the root ErrorBoundary rather than silently falling back to system fonts.
  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  // A failed open or migration rethrows into the root ErrorBoundary rather than running on a bad schema.
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <StatusBar style="light" />
      <AppStack />
    </SQLiteProvider>
  );
}

/** Until a pet is saved only the welcome and onboarding exist; saving it flips the guards and lands on the desk. */
function AppStack() {
  const onboarded = useOnboarded();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surfaceDeep } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
