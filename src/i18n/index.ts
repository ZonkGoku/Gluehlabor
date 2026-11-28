// Mehrsprachigkeit (Deutsch, Englisch) ohne Bibliothek. Der deutsche Text ist selbst der Schlüssel:
//   t('Rangliste')                                  → „Rangliste" bzw. „Ranking"
//   t('{n} Bewertungen', { n: 4 })                  → Platzhalter in geschweiften Klammern
//   tn(n, '{n} Bewertung', '{n} Bewertungen')       → Einzahl/Mehrzahl
// Fehlt eine englische Übersetzung, erscheint der deutsche Text. Neue Texte: deutsch schreiben, dann in en.ts ergänzen.
// Die Sprache wird pro Gerät gemerkt (localStorage); ohne Wahl gilt die Browsersprache (de* → Deutsch, sonst Englisch).
import { EN } from './en';

export type Sprache = 'de' | 'en';
const KEY = 'gluehlabor.sprache';

function lies(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function erkenne(): Sprache {
  if (typeof window === 'undefined') return 'de'; // Tests und Server: Deutsch
  const gewaehlt = lies();
  if (gewaehlt === 'de' || gewaehlt === 'en') return gewaehlt;
  const sprachen = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : [];
  const erste = sprachen.find(Boolean)?.toLowerCase() ?? 'de';
  return erste.startsWith('de') ? 'de' : 'en';
}

let sprache: Sprache = erkenne();
const hoerer = new Set<(s: Sprache) => void>();

export const aktuelleSprache = (): Sprache => sprache;
/** BCP-47-Code für Datums- und Zahlenformate. */
export const ortsCode = (): string => (sprache === 'en' ? 'en-GB' : 'de-DE');

export function setzeSprache(s: Sprache): void {
  if (s === sprache) return;
  sprache = s;
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* egal */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = s;
  hoerer.forEach((h) => h(s));
}

export function abonniereSprache(h: (s: Sprache) => void): () => void {
  hoerer.add(h);
  return () => void hoerer.delete(h);
}

export function startSprache(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = sprache;
}

type Werte = Record<string, string | number>;

function fuelle(text: string, werte?: Werte): string {
  return werte ? text.replace(/\{(\w+)\}/g, (_, k: string) => (k in werte ? String(werte[k]) : `{${k}}`)) : text;
}

/** Text in der aktuellen Sprache. */
export function t(text: string, werte?: Werte): string {
  return fuelle(sprache === 'en' ? (EN[text] ?? text) : text, werte);
}

/** Einzahl oder Mehrzahl (beide Formen mit {n}). */
export function tn(n: number, einzahl: string, mehrzahl: string): string {
  // Gleiche deutsche Form für beide (z. B. „{n} Becher"): englische Einzahl unter dem Schlüssel „<Text>|1".
  if (n === 1 && sprache === 'en' && EN[`${einzahl}|1`]) return fuelle(EN[`${einzahl}|1`], { n });
  return t(n === 1 ? einzahl : mehrzahl, { n });
}

/** Name eines Kriteriums. „Tasse" heißt als Kriterium englisch „Mug", „Becher" als Zählwort „cup". */
export function kriteriumLabel(label: string): string {
  return sprache === 'en' && label === 'Tasse' ? 'Mug' : t(label);
}
