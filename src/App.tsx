import { Einstellungen } from './ui/Einstellungen';
import { Erfassen } from './ui/Erfassen';
import { useRoute } from './ui/hooks';

// Hash-Router: funktioniert unter jedem Pages-Unterpfad ohne 404-Tricks.
// Die Rangliste wird später Startansicht; bis dahin startet die Erfassung.
export function App() {
  const route = useRoute();
  if (route === 'einstellungen') return <Einstellungen />;
  return <Erfassen />;
}
