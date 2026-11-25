// Abzeichen, Stufen und Glühwein-Pass. Alles wird aus den Bewertungen eines Geräts berechnet: ohne Anmeldung, ohne Server.
// Reine Funktionen. Texte sind deutsche Schlüssel, die Oberfläche übersetzt sie.
import { abendVon } from './community';
import { DEFAULT_GEWICHTE, type Eintrag, type Gewichte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { baueStaende, standId } from './staende';

export interface Abzeichen {
  id: string;
  name: string;
  /** Was man dafür tun muss, kurz. */
  text: string;
  symbol: string;
  /** Zielwert (z. B. 5 Fotos) und bisheriger Stand, höchstens bis zum Ziel. */
  ziel: number;
  stand: number;
  erreicht: boolean;
}

type MitFoto = Eintrag & { fotoBlob?: unknown };

const NACHT_AB = 22;
const NACHT_BIS = 5;

/** Stunde der Erfassung in der Zeit des Geräts. */
const stunde = (e: Eintrag) => new Date(e.erstelltAm).getHours();

function zaehle<T>(liste: readonly T[], schluessel: (e: T) => string | null): number {
  return new Set(liste.map(schluessel).filter((x): x is string => x !== null)).size;
}

/** Alle Abzeichen mit Fortschritt. `meine` = Bewertungen dieses Geräts, `alle` = alle bekannten Bewertungen. */
export function berechneAbzeichen(
  meine: readonly MitFoto[],
  alle: readonly Eintrag[],
  liste: MarktListe,
  gewichte: Gewichte = DEFAULT_GEWICHTE,
): Abzeichen[] {
  const staedte = zaehle(meine, (e) => stadtVon(liste, e));
  const maerkte = zaehle(meine, (e) => (e.markt && e.markt !== liste.sonstiger ? `${stadtVon(liste, e) ?? ''}|${e.markt}` : null));
  const abende = zaehle(meine, (e) => abendVon(e));
  const fotos = meine.filter((e) => e.fotoBlob).length;
  const notizen = meine.filter((e) => e.notiz && e.notiz.trim()).length;
  const nacht = meine.some((e) => stunde(e) >= NACHT_AB || stunde(e) < NACHT_BIS);

  // Gruppenführer: Ein Besuch, den ich angelegt habe, hat mindestens zwei weitere Bewertende
  const geraet = meine[0]?.geraet;
  const gruppe = meine.some((e) => {
    if (!e.besuchId) return false;
    const andere = new Set(alle.filter((x) => x.besuchId === e.besuchId && x.geraet && x.geraet !== (e.geraet ?? geraet)).map((x) => x.geraet));
    return andere.size >= 2;
  });

  // Top-Deal-Jäger: einen Stand bewertet, der heute ein Top Deal ist
  const topDeals = new Set(baueStaende(alle, liste, gewichte).filter((s) => s.deal.top).map((s) => s.id));
  const topDeal = meine.some((e) => topDeals.has(standId(e, liste)));

  const a = (id: string, name: string, text: string, symbol: string, ziel: number, stand: number): Abzeichen => ({
    id,
    name,
    text,
    symbol,
    ziel,
    stand: Math.min(stand, ziel),
    erreicht: stand >= ziel,
  });
  return [
    a('erster-schluck', 'Erster Schluck', 'Die erste Bewertung abgeben', 'becher', 1, meine.length),
    a('stammgast', 'Stammgast', '10 Bewertungen abgeben', 'flamme', 10, meine.length),
    a('staedtereise', 'Städtereise', 'In 3 Städten bewerten', 'pin', 3, staedte),
    a('marktforscher', 'Marktforscher', '5 verschiedene Märkte bewerten', 'ziel', 5, maerkte),
    a('treue', 'Treue', 'An 3 verschiedenen Abenden bewerten', 'uhr', 3, abende),
    a('nachtschwaermer', 'Nachtschwärmer', 'Nach 22 Uhr bewerten', 'mond', 1, nacht ? 1 : 0),
    a('fotograf', 'Fotograf', '5 Fotos hinzufügen', 'kamera', 5, fotos),
    a('schreiberling', 'Schreiberling', '3 Notizen schreiben', 'spickzettel', 3, notizen),
    a('gruppenfuehrer', 'Gruppenführer', 'Mit 2 anderen über den QR-Code bewerten', 'teilen', 1, gruppe ? 1 : 0),
    a('top-deal-jaeger', 'Top-Deal-Jäger', 'Einen Top Deal bewerten', 'pokal', 1, topDeal ? 1 : 0),
  ];
}

export interface Stufe {
  name: string;
  /** Ab dieser Zahl von Bewertungen. */
  ab: number;
}

export const STUFEN: readonly Stufe[] = [
  { name: 'Neuling', ab: 0 },
  { name: 'Probierer', ab: 1 },
  { name: 'Lehrling', ab: 3 },
  { name: 'Kenner', ab: 10 },
  { name: 'Glühwein-Meister', ab: 25 },
  { name: 'Legende', ab: 50 },
];

export interface StufenStand {
  stufe: Stufe;
  naechste: Stufe | null;
  /** 0 bis 1, Weg bis zur nächsten Stufe. */
  anteil: number;
  /** Wie viele Bewertungen bis zur nächsten Stufe fehlen. */
  fehlen: number;
}

export function stufeFuer(anzahl: number): StufenStand {
  let i = 0;
  while (i + 1 < STUFEN.length && anzahl >= STUFEN[i + 1].ab) i++;
  const stufe = STUFEN[i];
  const naechste = STUFEN[i + 1] ?? null;
  if (!naechste) return { stufe, naechste, anteil: 1, fehlen: 0 };
  return { stufe, naechste, anteil: (anzahl - stufe.ab) / (naechste.ab - stufe.ab), fehlen: naechste.ab - anzahl };
}

/** Stempel im Glühwein-Pass: eine Stadt mit der Zahl der Bewertungen dort, meistbesuchte zuerst. */
export function passStempel(meine: readonly Eintrag[], liste: MarktListe): { stadt: string; anzahl: number }[] {
  const z = new Map<string, number>();
  for (const e of meine) {
    const s = stadtVon(liste, e);
    if (s) z.set(s, (z.get(s) ?? 0) + 1);
  }
  return [...z.entries()].map(([stadt, anzahl]) => ({ stadt, anzahl })).sort((a, b) => b.anzahl - a.anzahl || a.stadt.localeCompare(b.stadt, 'de'));
}

/** Abzeichen, die durch diese eine Bewertung neu dazugekommen sind. */
export function neueAbzeichen(meine: readonly MitFoto[], alle: readonly Eintrag[], liste: MarktListe, neueId: string, gewichte: Gewichte = DEFAULT_GEWICHTE): Abzeichen[] {
  const vorher = new Set(
    berechneAbzeichen(
      meine.filter((e) => e.id !== neueId),
      alle.filter((e) => e.id !== neueId),
      liste,
      gewichte,
    )
      .filter((x) => x.erreicht)
      .map((x) => x.id),
  );
  return berechneAbzeichen(meine, alle, liste, gewichte).filter((x) => x.erreicht && !vorher.has(x.id));
}
