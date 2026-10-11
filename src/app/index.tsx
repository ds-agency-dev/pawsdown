import { StyleSheet, Text, View } from 'react-native';

import { color, fonts } from '@/design/tokens';
import { DuskScene } from '@/render/DuskScene';

// M1 spike screen: swirl + CRT full-screen, with an RN label on top to check fonts load.
export default function Index() {
  return (
    <View style={styles.container}>
      <DuskScene />
      <Text style={styles.label}>PAWSDOWN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceDeep,
  },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    color: color.ink,
  },
});
