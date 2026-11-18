// Vorschläge beim Erfassen: Gibt es den Stand schon? Verhindert Dubletten wie „Salz Chrom" und „salz-chrom",
// bevor sie entstehen. Reine Funktionen.
import { standSchluessel } from './auswertung';

export interface StandEintrag {
  stand: string;
  markt: string;
  stadt?: string;
}

export interface Vorschlag {
  stand: string;
  markt: string;
  stadt?: string;
  /** Wie viele Becher es dort schon gibt. */
  anzahl: number;
}

/** Bindestriche und Punkte zählen nicht: „salz-chrom" = „salz chrom". */
const kern = (s: string): string => standSchluessel(s).replace(/[-_.·,;:!?'"()]/g, ' ').replace(/\s+/g, ' ').trim();
const marktSchluessel = (m: string): string => m.trim().toLowerCase();

export function abstand(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let vor = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const akt = [i];
    for (let j = 1; j <= b.length; j++) {
      akt[j] = Math.min(vor[j] + 1, akt[j - 1] + 1, vor[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vor = akt;
  }
  return vor[b.length];
}

interface Gruppe {
  key: string;
  markt: string;
  stadt?: string;
  schreibweisen: Map<string, number>;
  anzahl: number;
}

function gruppiere(eintraege: readonly StandEintrag[]): Gruppe[] {
  const gruppen = new Map<string, Gruppe>();
  for (const e of eintraege) {
    const key = kern(e.stand);
    if (!key) continue;
    const id = `${key}|${marktSchluessel(e.markt)}`;
    let g = gruppen.get(id);
    if (!g) gruppen.set(id, (g = { key, markt: e.markt, stadt: e.stadt, schreibweisen: new Map(), anzahl: 0 }));
    g.anzahl++;
    g.stadt ??= e.stadt;
    const s = e.stand.trim();
    g.schreibweisen.set(s, (g.schreibweisen.get(s) ?? 0) + 1);
  }
  return [...gruppen.values()];
}

/** Häufigste Schreibweise, bei Gleichstand die zuerst genannte. */
const schoenste = (g: Gruppe): string => [...g.schreibweisen.entries()].sort((a, b) => b[1] - a[1])[0][0];

function treffer(key: string, eingabe: string): number {
  if (key === eingabe) return 100;
  if (key.startsWith(eingabe)) return 80;
  if (key.split(' ').some((w) => w.startsWith(eingabe))) return 65;
  if (eingabe.length >= 3 && key.includes(eingabe)) return 50;
  if (eingabe.length >= 4) {
    // Tippfehler: gleich lange Anfangsstücke und ganze Wörter vergleichen
    const grenze = eingabe.length >= 8 ? 2 : 1;
    const d = Math.min(abstand(key, eingabe), abstand(key.slice(0, eingabe.length), eingabe), ...key.split(' ').map((w) => abstand(w, eingabe)));
    if (d <= grenze) return 40 - d * 5;
  }
  return 0;
}

/**
 * Bis zu `max` Stände, die zur Eingabe passen. Stände am selben Markt kommen zuerst, dann nach Treffergüte und Zahl der Becher.
 * Leer, wenn die Eingabe zu kurz ist.
 */
export function schlageStaendeVor(eintraege: readonly StandEintrag[], eingabe: string, markt?: string, max = 5): Vorschlag[] {
  const e = kern(eingabe);
  if (e.length < 2) return [];
  const m = markt ? marktSchluessel(markt) : null;
  return gruppiere(eintraege)
    .map((g) => {
      const t = treffer(g.key, e);
      return { g, wert: t === 0 ? 0 : t + (m && marktSchluessel(g.markt) === m ? 20 : 0) + Math.min(g.anzahl, 5) };
    })
    .filter((x) => x.wert > 0)
    .sort((a, b) => b.wert - a.wert || b.g.anzahl - a.g.anzahl || schoenste(a.g).localeCompare(schoenste(b.g), 'de'))
    .slice(0, max)
    .map(({ g }) => ({ stand: schoenste(g), markt: g.markt, stadt: g.stadt, anzahl: g.anzahl }));
}

/**
 * Gibt es am selben Markt schon einen Stand mit demselben Namen (ohne Groß/Klein, Satzzeichen, Leerraum)?
 * Dann gilt dessen Schreibweise, damit die Rangliste nicht in Varianten zerfällt.
 */
export function kanonischerStand(eintraege: readonly StandEintrag[], stand: string, markt: string): string {
  const key = kern(stand);
  const m = marktSchluessel(markt);
  const g = gruppiere(eintraege).find((x) => x.key === key && marktSchluessel(x.markt) === m);
  return g ? schoenste(g) : stand.trim();
}
