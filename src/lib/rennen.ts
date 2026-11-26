// Schlittenfahren (Beta): Spieler legen ein Rennen an und laden andere per Link/QR ein. Jedes Gerät hat seinen eigenen Schlitten.
// Ein Schritt ist eine Bewertung dieses Geräts, die nach dem Beitritt und vor dem Ende des Rennens entstanden ist.
// Der Server speichert nur Rennen und Teilnehmer; die Schritte rechnet jede App selbst aus den öffentlichen Bewertungen
// (kein Konto, nichts Zusätzliches zu speichern). Es zählt die Zahl der Bewertungen, egal an welchem Stand.

/** Rennlänge in Schritten (Bewertungen): jede ganze Zahl von 2 bis 50, der Server prüft dieselben Grenzen. */
export const RENNEN_MIN = 2;
export const RENNEN_MAX = 50;
/** Schnellwahl in der App */
export const RENNEN_ZIELE = [3, 5, 10, 20] as const;
/** Farben der Schlitten, Index = Farbnummer (der Server erlaubt 0 bis 7). */
export const SCHLITTEN_FARBEN = ['#ffc857', '#ff8a3d', '#f0344f', '#7fd1ff', '#9be08a', '#d49bff', '#ff9bd0', '#e8e8e8'] as const;
/** Rennen-Kennung: 8 Zeichen, Kleinbuchstaben und Ziffern. */
export const RENNEN_ID = /^[a-z0-9]{8}$/;

export interface Rennen {
  id: string;
  name: string;
  ziel: number;
  /** Gerätekennung dessen, der das Rennen angelegt hat */
  ersteller?: string;
  erstellt_am: number;
  ende: number;
}
export interface Teilnehmer {
  geraet: string;
  kamel: string;
  farbe: number;
  seit: number;
}
type Zeile = { id: string; geraet?: string; erstelltAm: number; sync?: string };

export interface Bahn {
  geraet: string;
  kamel: string;
  farbe: number;
  schritte: number;
  /** 0 bis 1 */
  anteil: number;
  /** Platz (1, 1, 3 bei Gleichstand; wer im Ziel ist, steht vor allen anderen) */
  platz: number;
  imZiel: boolean;
  /** Zeitpunkt der Bewertung, mit der das Ziel erreicht wurde */
  zielZeit: number | null;
}

export interface RennenStand {
  bahnen: Bahn[];
  /** Wer zuerst im Ziel war (null: noch keiner) */
  sieger: Bahn | null;
  /** Zeit abgelaufen oder jemand im Ziel */
  vorbei: boolean;
  /** Es läuft noch, und zwar noch so viele Tage (aufgerundet) */
  tageUebrig: number;
}

/** Link, der das Rennen öffnet. `basis` ist die Adresse der App (mit oder ohne #). */
export function rennenLink(basis: string, id: string): string {
  return `${basis.replace(/#.*$/, '')}#/schlittenfahren/${id}`;
}

export function berechneRennen(rennen: Rennen, teilnehmer: readonly Teilnehmer[], eintraege: readonly Zeile[], jetzt: number = Date.now()): RennenStand {
  const bahnen: Bahn[] = teilnehmer.map((t) => {
    const zeiten = eintraege
      .filter((e) => e.geraet === t.geraet && !String(e.id).startsWith('import-') && e.sync !== 'abgelehnt' && e.erstelltAm >= t.seit && e.erstelltAm <= rennen.ende)
      .map((e) => e.erstelltAm)
      .sort((a, b) => a - b);
    const schritte = Math.min(zeiten.length, rennen.ziel);
    return {
      geraet: t.geraet,
      kamel: t.kamel,
      farbe: t.farbe,
      schritte,
      anteil: schritte / rennen.ziel,
      platz: 0,
      imZiel: zeiten.length >= rennen.ziel,
      zielZeit: zeiten.length >= rennen.ziel ? zeiten[rennen.ziel - 1] : null,
    };
  });
  // Reihenfolge: zuerst die im Ziel (wer früher ankam), dann nach Schritten
  const vor = (a: Bahn, b: Bahn) => {
    if (a.imZiel !== b.imZiel) return a.imZiel ? -1 : 1;
    if (a.imZiel && b.imZiel) return (a.zielZeit as number) - (b.zielZeit as number);
    return b.schritte - a.schritte;
  };
  const gleich = (a: Bahn, b: Bahn) => (a.imZiel && b.imZiel ? a.zielZeit === b.zielZeit : !a.imZiel && !b.imZiel && a.schritte === b.schritte);
  for (const b of bahnen) b.platz = 1 + bahnen.filter((x) => vor(x, b) < 0 && !gleich(x, b)).length;
  bahnen.sort((a, b) => a.platz - b.platz || a.kamel.localeCompare(b.kamel, 'de'));
  const zielSieger = bahnen.find((b) => b.imZiel) ?? null;
  const vorbei = zielSieger !== null || jetzt > rennen.ende;
  // Läuft die Zeit ab, ohne dass jemand im Ziel ist, gewinnt, wer die meisten Schritte hat (mindestens einen).
  const sieger = zielSieger ?? (vorbei && bahnen[0] && bahnen[0].schritte > 0 ? bahnen[0] : null);
  return { bahnen, sieger, vorbei, tageUebrig: vorbei ? 0 : Math.max(1, Math.ceil((rennen.ende - jetzt) / 86_400_000)) };
}

// ───────── Wochenrennen: ein offenes Rennen für alle, jede Woche neu ─────────

/** Länge des Wochenrennens in Schritten (der Server legt es mit demselben Wert an). */
export const WOCHEN_ZIEL = 20;
/** Kennung `w<Jahr>w<Woche>` (ISO-Woche, UTC), immer 8 Zeichen, passt zu RENNEN_ID. */
export const WOCHEN_ID = /^w\d{4}w\d{2}$/;
export const istWochenrennen = (id: string): boolean => WOCHEN_ID.test(id);

/** Kennung des Wochenrennens, in dem `jetzt` liegt. */
export function wochenRennenId(jetzt: Date = new Date()): string {
  const d = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate()));
  const tag = d.getUTCDay() || 7; // Mo = 1 … So = 7
  d.setUTCDate(d.getUTCDate() + 4 - tag); // Donnerstag der Woche bestimmt das Jahr
  const jahr = d.getUTCFullYear();
  const woche = Math.ceil(((d.getTime() - Date.UTC(jahr, 0, 1)) / 86_400_000 + 1) / 7);
  return `w${jahr}w${String(woche).padStart(2, '0')}`;
}

// ───────── Lage im Rennen (Spannung) ─────────

export interface Lage {
  art: 'start' | 'vorn' | 'gleich' | 'hinten' | 'ende';
  /** Abstand in Schritten zum Verfolger (vorn) bzw. zum Führenden (hinten) */
  abstand: number;
  /** Name des Verfolgers bzw. des Führenden */
  gegner: string | null;
  /** Schritte bis ins Ziel */
  fehlt: number;
  platz: number;
}

/** Wie steht es für das eigene Gerät? null, wenn es nicht mitfährt. */
export function lage(stand: RennenStand, ziel: number, ich: string | null): Lage | null {
  const b = stand.bahnen.find((x) => x.geraet === ich);
  if (!b) return null;
  const fehlt = Math.max(0, ziel - b.schritte);
  if (stand.vorbei) return { art: 'ende', abstand: 0, gegner: null, fehlt, platz: b.platz };
  if (stand.bahnen.every((x) => x.schritte === 0)) return { art: 'start', abstand: 0, gegner: null, fehlt, platz: b.platz };
  const andere = stand.bahnen.filter((x) => x.geraet !== ich);
  if (andere.length === 0) return { art: 'vorn', abstand: 0, gegner: null, fehlt, platz: b.platz };
  const vorn = andere.reduce((m, x) => (x.schritte > m.schritte ? x : m));
  if (vorn.schritte > b.schritte) return { art: 'hinten', abstand: vorn.schritte - b.schritte, gegner: vorn.kamel, fehlt, platz: b.platz };
  if (vorn.schritte === b.schritte) return { art: 'gleich', abstand: 0, gegner: vorn.kamel, fehlt, platz: b.platz };
  return { art: 'vorn', abstand: b.schritte - vorn.schritte, gegner: vorn.kamel, fehlt, platz: b.platz };
}

/** Bei vielen Fahrern (Wochenrennen) zeigt die Bahn nur die Besten und dich. `rest` = wie viele fehlen. */
export function sichtbareBahnen(bahnen: readonly Bahn[], ich: string | null, max: number): { sichtbar: Bahn[]; rest: number } {
  if (bahnen.length <= max) return { sichtbar: [...bahnen], rest: 0 };
  const spitze = bahnen.slice(0, max - 1);
  const meine = bahnen.find((b) => b.geraet === ich);
  const sichtbar = meine && !spitze.includes(meine) ? [...spitze, meine] : bahnen.slice(0, max);
  return { sichtbar, rest: bahnen.length - sichtbar.length };
}
