// Angaben zum Betreiber für Impressum und Datenschutzerklärung. Reine Funktionen.

export interface Betreiber {
  name: string;
  strasse: string;
  ort: string;
  email: string;
  telefon?: string;
  hostingStandort?: string;
}

// Die Straße ist keine Pflicht für den Start: Philip hat sich bewusst für Name und Ort entschieden (privates Spaßprojekt).
const PFLICHT: [keyof Betreiber, string][] = [
  ['name', 'Name'],
  ['ort', 'Ort'],
  ['email', 'E-Mail-Adresse'],
];

/** Hinweise, die den Start nicht blockieren, aber bekannt sein sollten. */
export function hinweise(b: Partial<Betreiber>): string[] {
  const h: string[] = [];
  if (!(b.strasse ?? '').trim()) {
    h.push('Keine Straße angegeben: Ein Impressum ohne vollständige Anschrift ist rechtlich angreifbar (nach § 5 DDG zählt eine ladungsfähige Anschrift). Hier bewusst so entschieden.');
  }
  return h;
}

/** Welche Pflichtangaben fehlen noch? Leere Liste = vollständig. */
export function fehlendeAngaben(b: Partial<Betreiber>): string[] {
  const fehlt = PFLICHT.filter(([k]) => !(b[k] ?? '').trim()).map(([, label]) => label);
  if ((b.email ?? '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email!.trim())) fehlt.push('gültige E-Mail-Adresse');
  return fehlt;
}
