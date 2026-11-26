// Kamelrennen nach Bethlehem (Beta): drei Kamele laufen auf drei Bahnen zum Stall. Jede Bewertung der Community ist ein Schritt für das Kamel,
// zu dem das Gerät gehört. Die Zuordnung ergibt sich aus der Gerätekennung (kein Konto, nichts wird gespeichert), alle Geräte rechnen gleich.
// Reine Rechnung aus den Bewertungen, die auf dem Gerät liegen. Es zählt nicht, wie viel jemand trinkt: je Gerät, Stand und Abend gibt es
// ohnehin nur eine Bewertung (siehe abendVon).
import { abendVon } from './community';

export const KARAWANE_SAISON = 2026;
/** Heiligabend: bis dahin soll ein Kamel angekommen sein. */
export const HEILIGABEND = '2026-12-24';

/** Die drei Kamele (deutsche Namen, die Oberfläche zeigt sie unverändert). */
export const KAMELE = ['Kaspar', 'Melchior', 'Balthasar'] as const;
export type Kamel = (typeof KAMELE)[number];

/** Schritte, die ein Kamel bis Bethlehem braucht. */
export const ZIEL = 60;

export interface Station {
  /** Deutscher Text, die Oberfläche übersetzt ihn mit t(). */
  name: string;
  ab: number;
}
export const STATIONEN: readonly Station[] = [
  { name: 'Aufbruch', ab: 0 },
  { name: 'Oase', ab: 20 },
  { name: 'Jerusalem', ab: 40 },
  { name: 'Bethlehem', ab: ZIEL },
];

export interface BahnStand {
  kamel: Kamel;
  schritte: number;
  /** 0 bis 1 */
  anteil: number;
  /** Platz (1, 1, 3 bei Gleichstand) */
  platz: number;
  angekommen: boolean;
}

export interface KarawaneStand {
  bahnen: BahnStand[];
  /** Alle Schritte aller Kamele */
  gesamt: number;
  /** Mindestens ein Kamel ist in Bethlehem */
  angekommen: boolean;
  /** Das Kamel des eigenen Geräts (null ohne Kennung) */
  meinKamel: Kamel | null;
  meine: number;
  heute: number;
  /** Tage bis Heiligabend (0 am Tag selbst und danach) */
  tage: number;
  /** Schritte, die dem Führenden bis Bethlehem fehlen */
  fehlt: number;
}

type Zeile = { id: string; saison: number; geraet?: string; datum?: string | null; erstelltAm: number; sync?: string };

const istCommunity = (e: Zeile) => !e.id.startsWith('import-') && e.sync !== 'bestand' && e.saison === KARAWANE_SAISON;

/** Stabile Zuordnung Gerät → Kamel (FNV-1a), in jeder Version und auf jedem Gerät gleich. */
export function kamelVon(kennung: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < kennung.length; i++) {
    h ^= kennung.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % KAMELE.length;
}

function tageBis(ziel: string, jetzt: Date): number {
  const a = Date.UTC(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const [j, m, t] = ziel.split('-').map(Number);
  return Math.max(0, Math.round((Date.UTC(j, m - 1, t) - a) / 86400000));
}

export function berechneKarawane(eintraege: readonly Zeile[], eigeneKennung: string | null, jetzt: Date = new Date()): KarawaneStand {
  const alle = eintraege.filter(istCommunity);
  const p = (n: number) => String(n).padStart(2, '0');
  const heuteTag = `${jetzt.getFullYear()}-${p(jetzt.getMonth() + 1)}-${p(jetzt.getDate())}`;
  const zaehler = KAMELE.map(() => 0);
  for (const e of alle) zaehler[kamelVon(e.geraet ?? e.id)]++;
  const bahnen: BahnStand[] = KAMELE.map((kamel, i) => ({
    kamel,
    schritte: zaehler[i],
    anteil: Math.min(1, zaehler[i] / ZIEL),
    platz: 1 + zaehler.filter((z) => z > zaehler[i]).length,
    angekommen: zaehler[i] >= ZIEL,
  }));
  const vorn = Math.max(...zaehler);
  return {
    bahnen,
    gesamt: alle.length,
    angekommen: vorn >= ZIEL,
    meinKamel: eigeneKennung ? KAMELE[kamelVon(eigeneKennung)] : null,
    meine: eigeneKennung ? alle.filter((e) => e.geraet === eigeneKennung).length : 0,
    heute: alle.filter((e) => abendVon(e) === heuteTag).length,
    tage: tageBis(HEILIGABEND, jetzt),
    fehlt: Math.max(0, ZIEL - vorn),
  };
}
