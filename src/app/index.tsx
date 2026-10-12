import { Redirect } from 'expo-router';

/** The app opens on the desk; tabs live at named routes so each trigger resolves to a real screen. */
export default function Index() {
  return <Redirect href="/desk" />;
}
