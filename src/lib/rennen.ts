// Schlittenrennen (Beta): Spieler legen ein Rennen an und laden andere per Link/QR ein. Jedes Gerät hat seinen eigenen Schlitten.
// Ein Schritt ist eine Bewertung dieses Geräts, die nach dem Beitritt und vor dem Ende des Rennens entstanden ist.
// Der Server speichert nur Rennen und Teilnehmer; die Schritte rechnet jede App selbst aus den öffentlichen Bewertungen
// (kein Konto, nichts Zusätzliches zu speichern). Es zählt nicht die Menge: je Gerät, Stand und Abend gibt es nur eine Bewertung.

/** Mögliche Rennlängen in Schritten (Bewertungen). Der Server prüft dieselbe Liste. */
export const RENNEN_ZIELE = [10, 20, 30] as const;
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
type Zeile = { id: string; geraet?: string; erstelltAm: number };

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
  return `${basis.replace(/#.*$/, '')}#/schlittenrennen/${id}`;
}

export function berechneRennen(rennen: Rennen, teilnehmer: readonly Teilnehmer[], eintraege: readonly Zeile[], jetzt: number = Date.now()): RennenStand {
  const bahnen: Bahn[] = teilnehmer.map((t) => {
    const zeiten = eintraege
      .filter((e) => e.geraet === t.geraet && !('id' in e && String(e.id).startsWith('import-')) && e.erstelltAm >= t.seit && e.erstelltAm <= rennen.ende)
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
  const sieger = bahnen.find((b) => b.imZiel) ?? null;
  const vorbei = sieger !== null || jetzt > rennen.ende;
  return { bahnen, sieger, vorbei, tageUebrig: vorbei ? 0 : Math.max(1, Math.ceil((rennen.ende - jetzt) / 86_400_000)) };
}
