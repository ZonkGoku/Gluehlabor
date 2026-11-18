// Ortssuche für die Erfassung: Städte in Deutschland und Österreich (data/orte.json, GeoNames), Suche ohne Rücksicht auf
// Groß/Klein, Umlaute und ß („muenchen" findet München), Städte in der Nähe, beliebte Städte und Märkte je Stadt. Reine Funktionen.
import type { MarktListe } from './orte';
import { stadtVon } from './orte';

export interface Ort {
  name: string;
  lat: number;
  lon: number;
  /** Bundesland oder „Österreich". */
  land: string;
  /** Einwohner in Hundert (nur zum Sortieren). */
  einw: number;
  /** Suchschlüssel, siehe schluessel(). */
  key: string;
}

export interface OrteDaten {
  quelle: string;
  laender: string[];
  orte: [string, number, number, number, number][];
}

/** Vergleichsform: klein, ohne Akzente, ä→a, ö→o, ü→u, ß→ss, „ae/oe/ue"→a/o/u, Satzzeichen wie Leerzeichen. */
export function schluessel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function baueOrte(d: OrteDaten): Ort[] {
  return d.orte.map(([name, lat, lon, land, einw]) => ({ name, lat, lon, land: d.laender[land] ?? '', einw, key: schluessel(name) }));
}

/**
 * Passende Orte: erst die, die so beginnen, dann die mit einem Wort, das so beginnt, dann alle mit dem Text irgendwo (ab 3 Zeichen).
 * Innerhalb jeder Stufe die größeren Orte zuerst, damit „mü" München vor Mülheim zeigt.
 */
export function sucheOrte(orte: readonly Ort[], eingabe: string, max = 8): Ort[] {
  const q = schluessel(eingabe);
  if (!q) return [];
  const treffer: { o: Ort; stufe: number }[] = [];
  for (const o of orte) {
    let stufe = 4;
    if (o.key === q) stufe = 0;
    else if (o.key.startsWith(q)) stufe = 1;
    else if (o.key.includes(` ${q}`)) stufe = 2;
    else if (q.length >= 3 && o.key.includes(q)) stufe = 3;
    if (stufe < 4) treffer.push({ o, stufe });
  }
  treffer.sort((a, b) => a.stufe - b.stufe || b.o.einw - a.o.einw || a.o.name.localeCompare(b.o.name, 'de'));
  const gesehen = new Set<string>();
  const aus: Ort[] = [];
  for (const { o } of treffer) {
    const id = `${o.name}|${o.land}`;
    if (gesehen.has(id)) continue;
    gesehen.add(id);
    aus.push(o);
    if (aus.length >= max) break;
  }
  return aus;
}

/** Ort mit genau diesem Namen (ohne Groß/Klein, Umlaute), der größte zuerst. */
export function findeOrt(orte: readonly Ort[], name: string): Ort | null {
  const q = schluessel(name);
  if (!q) return null;
  let best: Ort | null = null;
  for (const o of orte) if (o.key === q && (!best || o.einw > best.einw)) best = o;
  return best;
}

/** Entfernung in Kilometern (Haversine). */
export function entfernungKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Die nächsten Orte zu einer Position, mit Abstand. Ganz kleine Orte erst, wenn nichts Größeres in der Nähe ist. */
export function naechsteOrte(orte: readonly Ort[], lat: number, lon: number, n = 5): (Ort & { km: number })[] {
  return orte
    .map((o) => ({ ...o, km: entfernungKm(lat, lon, o.lat, o.lon) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

export interface BeliebteStadt {
  stadt: string;
  becher: number;
}

/** Städte, in denen schon bewertet wurde, die meistbesuchte zuerst. */
export function beliebteStaedte(eintraege: readonly { markt: string; stadt?: string }[], liste: MarktListe, max = 6): BeliebteStadt[] {
  const zaehler = new Map<string, number>();
  for (const e of eintraege) {
    const s = stadtVon(liste, e);
    if (s) zaehler.set(s, (zaehler.get(s) ?? 0) + 1);
  }
  return [...zaehler.entries()]
    .map(([stadt, becher]) => ({ stadt, becher }))
    .sort((a, b) => b.becher - a.becher || a.stadt.localeCompare(b.stadt, 'de'))
    .slice(0, max);
}

export interface MarktAuswahl {
  markt: string;
  /** Aus der gepflegten Liste (sonst nur von Nutzern eingetragen). */
  gepflegt: boolean;
  becher: number;
}

/**
 * Märkte einer Stadt für die Auswahl: die gepflegten (in Listenreihenfolge) und alle, die dort schon bewertet wurden.
 * Gepflegte mit Bechern zuerst nach Zahl der Becher, „Sonstiger" fehlt (das ist „kein Markt").
 */
export function maerkteIn(eintraege: readonly { markt: string; stadt?: string }[], liste: MarktListe, stadt: string): MarktAuswahl[] {
  const s = schluessel(stadt);
  const gepflegt = liste.staedte.find((x) => schluessel(x.stadt) === s)?.maerkte ?? [];
  const zaehler = new Map<string, number>();
  for (const e of eintraege) {
    if (e.markt === liste.sonstiger || !e.markt.trim()) continue;
    const st = stadtVon(liste, e);
    if (st && schluessel(st) === s) zaehler.set(e.markt, (zaehler.get(e.markt) ?? 0) + 1);
  }
  const alle = new Map<string, MarktAuswahl>();
  gepflegt.forEach((m) => alle.set(m, { markt: m, gepflegt: true, becher: zaehler.get(m) ?? 0 }));
  for (const [m, n] of zaehler) if (!alle.has(m)) alle.set(m, { markt: m, gepflegt: false, becher: n });
  const reihenfolge = new Map(gepflegt.map((m, i) => [m, i]));
  return [...alle.values()].sort(
    (a, b) => b.becher - a.becher || (reihenfolge.get(a.markt) ?? 999) - (reihenfolge.get(b.markt) ?? 999) || a.markt.localeCompare(b.markt, 'de'),
  );
}
