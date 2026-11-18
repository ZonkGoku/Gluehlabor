import { Detail } from './ui/Detail';
import { Einstellungen } from './ui/Einstellungen';
import { Erfassen } from './ui/Erfassen';
import { Geruest } from './ui/Geruest';
import { useRoute } from './ui/hooks';
import { Rangliste } from './ui/Rangliste';
import { Spickzettel } from './ui/Spickzettel';
import { Statistik } from './ui/Statistik';
import { Uebersicht } from './ui/Uebersicht';
import { Vergleich } from './ui/Vergleich';

// Hash-Router: funktioniert unter jedem Pages-Unterpfad ohne 404-Tricks.
export function App() {
  const route = useRoute();
  if (route === 'erfassen') return <Erfassen />;

  let seite;
  if (route === 'rangliste') seite = <Rangliste />;
  else if (route.startsWith('becher/')) seite = <Detail id={decodeURIComponent(route.slice(7))} />;
  else if (route === 'vergleich') seite = <Vergleich />;
  else if (route === 'statistik') seite = <Statistik />;
  else if (route === 'spickzettel') seite = <Spickzettel />;
  else if (route === 'einstellungen') seite = <Einstellungen />;
  else seite = <Uebersicht />;

  return <Geruest route={route}>{seite}</Geruest>;
}
