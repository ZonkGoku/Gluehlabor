import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/anton/latin-400.css';
import './styles.css';
import './app.css';
import './nacht.css';

import { render } from 'preact';
import { App } from './App';
import { starteDarstellung } from './daten/darstellung';
import { starteSync } from './daten/sync';
import { starteUpdates } from './daten/update';
import { startSprache } from './i18n';

starteDarstellung();
startSprache();
render(<App />, document.getElementById('app')!);
starteSync();
starteUpdates();
