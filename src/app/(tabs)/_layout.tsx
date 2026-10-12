import { TabList, Tabs, TabSlot, TabTrigger, useTabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';

import { TabBar, TABS, type TabKey } from '@/components/TabBar';
import { color } from '@/design/tokens';

const HREF = {
  desk: '/desk',
  episodes: '/episodes',
  room: '/room',
  settings: '/settings',
} as const satisfies Record<TabKey, string>;

/** Headless router tabs: the hidden TabList registers the routes, our pixel TabBar does the switching. */
export default function TabsLayout() {
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={styles.hidden}>
        {TABS.map((t) => (
          <TabTrigger key={t.key} name={t.key} href={HREF[t.key]} />
        ))}
      </TabList>
      <RouterTabBar />
    </Tabs>
  );
}

function RouterTabBar() {
  const { getTrigger, switchTab } = useTabTrigger({ name: 'desk' });
  const active = TABS.find((t) => getTrigger(t.key)?.isFocused)?.key ?? 'desk';
  return (
    <View>
      <TabBar active={active} onSelect={(tab) => switchTab(tab, {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceDeep },
  hidden: { display: 'none' },
});
