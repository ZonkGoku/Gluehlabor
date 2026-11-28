import { Detail } from './ui/Detail';
import { Entdecken } from './ui/Entdecken';
import { Aendern } from './ui/Aendern';
import { Feedback } from './ui/Feedback';
import { Fotos } from './ui/Fotos';
import { MeineBewertungen } from './ui/MeineBewertungen';
import { RennenSeite, SchlittenfahrenUebersicht } from './ui/Schlittenfahren';
import { Einstellungen } from './ui/Einstellungen';
import { Erfassen } from './ui/Erfassen';
import { Profil } from './ui/Profil';
import { Datenschutz, Impressum } from './ui/Rechtliches';
import { Geruest } from './ui/Geruest';
import { useRoute } from './ui/hooks';
import { Rangliste } from './ui/Rangliste';
import { StandSeite } from './ui/Stand';
import { Moderation } from './ui/Moderation';
import { Spickzettel } from './ui/Spickzettel';
import { Mitbewerten } from './ui/Mitbewerten';
import { Statistik } from './ui/Statistik';
import { Teilen } from './ui/Teilen';
import { Uebersicht } from './ui/Uebersicht';
import { Vergleich } from './ui/Vergleich';
import { useSprache } from './i18n/hooks';

// Hash-Router: funktioniert unter jedem Pages-Unterpfad ohne 404-Tricks.
export function App() {
  useSprache(); // Sprachwechsel zeichnet alles neu
  const route = useRoute();
  // Dieselbe Kopfzeile überall: das Logo führt immer zur Startseite. Beim Bewerten ohne Tab-Leiste, dort sitzt unten „Speichern".
  if (route === 'erfassen') return <Geruest route={route} ohneNavigation><Erfassen /></Geruest>;
  if (route === 'teilen') return <Geruest route={route} ohneNavigation><Teilen /></Geruest>;
  if (route === 'mitbewerten') return <Geruest route={route} ohneNavigation><Mitbewerten /></Geruest>;
  if (route.startsWith('aendern/')) return <Geruest route={route} ohneNavigation><Aendern id={decodeURIComponent(route.slice('aendern/'.length))} /></Geruest>;

  let seite;
  if (route === 'rangliste') seite = <Rangliste />;
  else if (route.startsWith('becher/')) seite = <Detail id={decodeURIComponent(route.slice(7))} />;
  else if (route.startsWith('stand/')) seite = <StandSeite id={decodeURIComponent(route.slice(6))} />;
  else if (route === 'moderation') seite = <Moderation />;
  else if (route === 'mehr') {
    location.replace('#/profil'); // alter Link: „Mehr“ gibt es nicht mehr, Hilfe und Einstellungen stehen unter „Ich“
    return null;
  }
  else if (route === 'feedback') seite = <Feedback />;
  else if (route === 'entdecken') seite = <Entdecken />;
  else if (route === 'meine') seite = <MeineBewertungen />;
  else if (route === 'fotos') seite = <Fotos />;
  else if (route === 'schlittenfahren' || route === 'schlittenrennen' || route === 'kamelrennen') seite = <SchlittenfahrenUebersicht />;
  else if (route.startsWith('schlittenfahren/') || route.startsWith('schlittenrennen/') || route.startsWith('kamelrennen/')) seite = <RennenSeite id={route.slice(route.indexOf('/') + 1)} />;
  else if (route === 'vergleich') seite = <Vergleich />;
  else if (route === 'statistik') seite = <Statistik />;
  else if (route === 'spickzettel') seite = <Spickzettel />;
  else if (route === 'einstellungen') seite = <Einstellungen />;
  else if (route === 'profil') seite = <Profil />;
  else if (route === 'impressum') seite = <Impressum />;
  else if (route === 'datenschutz') seite = <Datenschutz />;
  else seite = <Uebersicht />;

  return <Geruest route={route}>{seite}</Geruest>;
}
