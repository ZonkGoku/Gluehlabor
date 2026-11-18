// Wohin synchronisiert wird. Schreiben erfolgt per GitHub-Contents-API direkt
// auf main; jeder Eintrag ist eine eigene Datei, daher keine Konflikte.
export const REPO = { owner: 'ZonkGoku', name: 'Becherwerk', branch: 'main' } as const;
export const PFAD_EINTRAEGE = 'data/eintraege';
export const PFAD_FOTOS = 'data/fotos';

/** Vom Build erzeugter, öffentlicher Datenbestand (relativ zur App). */
export const URL_DATENBESTAND = './daten/eintraege.json';
export const URL_FOTOS = './daten/';
