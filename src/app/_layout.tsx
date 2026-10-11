import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hide();
  }, [fontsLoaded, fontError]);

  // Surfaces in the root ErrorBoundary rather than silently falling back to system fonts.
  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surfaceDeep } }} />
    </>
  );
}
