import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles.css';

import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { leseEinstellung } from './daten/db';
import { starteSync } from './daten/sync';
import { wendeThemeAn } from './ui/Einstellungen';

void leseEinstellung<'auto' | 'hell' | 'dunkel'>('theme', 'auto').then(wendeThemeAn);
render(<App />, document.getElementById('app')!);
starteSync();
// Neue Version wartet, bis die App geschlossen wird – nie Neuladen mitten in der Erfassung.
registerSW({ immediate: true });
