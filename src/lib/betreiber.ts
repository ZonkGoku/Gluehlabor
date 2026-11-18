// Angaben zum Betreiber für Impressum und Datenschutzerklärung. Reine Funktionen.

export interface Betreiber {
  name: string;
  strasse: string;
  ort: string;
  email: string;
  telefon?: string;
  hostingStandort?: string;
}

const PFLICHT: [keyof Betreiber, string][] = [
  ['name', 'Name'],
  ['strasse', 'Straße und Hausnummer'],
  ['ort', 'Postleitzahl und Ort'],
  ['email', 'E-Mail-Adresse'],
];

/** Welche Pflichtangaben fehlen noch? Leere Liste = vollständig. */
export function fehlendeAngaben(b: Partial<Betreiber>): string[] {
  const fehlt = PFLICHT.filter(([k]) => !(b[k] ?? '').trim()).map(([, label]) => label);
  if ((b.email ?? '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email!.trim())) fehlt.push('gültige E-Mail-Adresse');
  return fehlt;
}
