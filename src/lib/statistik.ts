// Statistik: Benutzt ihr die Skala noch brauchbar? Reine Funktionen.

import { KRITERIEN, type Eintrag, type Gewichte, type Kriterium } from './modell';
import { bewerte } from './scoring';

export interface KriteriumStatistik {
  kriterium: Kriterium;
  n: number;
  mittel: number | null;
  min: number | null;
  max: number | null;
  /** max − min, wie im alten Sheet. */
  spanne: number | null;
  /** Standardabweichung der Grundgesamtheit (STDEVP). */
  streuung: number | null;
  /** Tatsächlich vergebene Stufen, aufsteigend. */
  stufen: number[];
  /** Pearson-Korrelation mit Geschmack (paarweise vollständige Einträge). null für Geschmack selbst. */
  korrGeschmack: number | null;
}

export function mittelwert(xs: readonly number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Standardabweichung der Grundgesamtheit. */
export function streuung(xs: readonly number[]): number | null {
  const m = mittelwert(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/** Pearson-Korrelation. null bei weniger als 3 Paaren oder ohne Varianz. */
export function korrelation(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const mx = mittelwert(xs)!;
  const my = mittelwert(ys)!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

function paare(eintraege: readonly Eintrag[], a: Kriterium, b: Kriterium): [number[], number[]] {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const e of eintraege) {
    const x = e.noten[a];
    const y = e.noten[b];
    if (x !== null && y !== null) {
      xs.push(x);
      ys.push(y);
    }
  }
  return [xs, ys];
}

export function korrelationZwischen(eintraege: readonly Eintrag[], a: Kriterium, b: Kriterium): number | null {
  const [xs, ys] = paare(eintraege, a, b);
  return korrelation(xs, ys);
}

export function kriteriumStatistik(eintraege: readonly Eintrag[], k: Kriterium): KriteriumStatistik {
  const werte = eintraege.map((e) => e.noten[k]).filter((x): x is number => x !== null);
  const min = werte.length ? Math.min(...werte) : null;
  const max = werte.length ? Math.max(...werte) : null;
  return {
    kriterium: k,
    n: werte.length,
    mittel: mittelwert(werte),
    min,
    max,
    spanne: min === null || max === null ? null : max - min,
    streuung: streuung(werte),
    stufen: [...new Set(werte)].sort((a, b) => a - b),
    korrGeschmack: k === 'geschmack' ? null : korrelationZwischen(eintraege, k, 'geschmack'),
  };
}

export interface Ueberblick {
  eintraege: number;
  einzelnoten: number;
  zehner: number;
  einsOderZwei: number;
  beste: number | null;
  schlechteste: number | null;
  spanneGesamt: number | null;
  /** Wie viele der zehn Stufen über alle Kriterien mindestens einmal vergeben wurden. */
  genutzteStufen: number;
}

export function ueberblick(eintraege: readonly Eintrag[], gewichte: Gewichte): Ueberblick {
  const noten = eintraege.flatMap((e) => KRITERIEN.map((k) => e.noten[k])).filter((x): x is number => x !== null);
  const gesamt = eintraege.map((e) => bewerte(e.noten, gewichte).gesamt).filter((x): x is number => x !== null);
  const beste = gesamt.length ? Math.max(...gesamt) : null;
  const schlechteste = gesamt.length ? Math.min(...gesamt) : null;
  return {
    eintraege: eintraege.length,
    einzelnoten: noten.length,
    zehner: noten.filter((n) => n === 10).length,
    einsOderZwei: noten.filter((n) => n <= 2).length,
    beste,
    schlechteste,
    spanneGesamt: beste === null || schlechteste === null ? null : beste - schlechteste,
    genutzteStufen: new Set(noten).size,
  };
}

export interface PegelStufe {
  /** 1..4 einzeln, 5 steht für „5 und mehr". */
  becherNr: number;
  anzahl: number;
  mittel: number | null;
}

/** Durchschnittliche Gesamtnote je Becher-Nr. des Abends. */
export function pegel(eintraege: readonly Eintrag[], gewichte: Gewichte): PegelStufe[] {
  const gruppen = new Map<number, number[]>();
  for (const e of eintraege) {
    if (e.becherNr === undefined) continue;
    const g = bewerte(e.noten, gewichte).gesamt;
    if (g === null) continue;
    const nr = Math.min(e.becherNr, 5);
    gruppen.set(nr, [...(gruppen.get(nr) ?? []), g]);
  }
  return [1, 2, 3, 4, 5].map((nr) => ({
    becherNr: nr,
    anzahl: gruppen.get(nr)?.length ?? 0,
    mittel: mittelwert(gruppen.get(nr) ?? []),
  }));
}

/** Steigung der Gesamtnote pro weiterem Becher (lineare Regression). null bei zu wenig Daten. */
export function pegelSteigung(eintraege: readonly Eintrag[], gewichte: Gewichte): { steigung: number; n: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const e of eintraege) {
    const g = bewerte(e.noten, gewichte).gesamt;
    if (e.becherNr === undefined || g === null) continue;
    xs.push(e.becherNr);
    ys.push(g);
  }
  if (xs.length < 4 || new Set(xs).size < 2) return null;
  const mx = mittelwert(xs)!;
  const my = mittelwert(ys)!;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
  });
  return { steigung: sxy / sxx, n: xs.length };
}

export type Schwere = 'warnung' | 'hinweis' | 'gut';

export interface Befund {
  schwere: Schwere;
  text: string;
}

const KORR_SCHWELLE = 0.6;
const SPANNE_SCHWELLE = 5;

const komma = (x: number, stellen = 2) => x.toFixed(stellen).replace('.', ',').replace('-', '−');

/**
 * Formuliert die Auffälligkeiten als Sätze. `labels` liefert die Anzeigenamen
 * der Kriterien (aus data/anker.json), damit hier kein Text doppelt gepflegt wird.
 */
export function befunde(
  eintraege: readonly Eintrag[],
  gewichte: Gewichte,
  labels: Record<Kriterium, string>,
): Befund[] {
  const out: Befund[] = [];
  if (eintraege.length < 3) {
    return [{ schwere: 'hinweis', text: 'Noch zu wenige Becher für eine belastbare Statistik. Ab drei geht es los.' }];
  }
  const stats = KRITERIEN.map((k) => kriteriumStatistik(eintraege, k));
  const u = ueberblick(eintraege, gewichte);

  for (const s of stats) {
    if (s.spanne !== null && s.n >= 3 && s.spanne < SPANNE_SCHWELLE) {
      out.push({
        schwere: 'warnung',
        text: `Beim ${labels[s.kriterium]} habt ihr nur ${s.min} bis ${s.max} vergeben. Die Skala hat zehn Stufen.`,
      });
    }
  }

  if (u.einzelnoten >= 20 && u.zehner === 0) {
    out.push({
      schwere: 'warnung',
      text: `Die 10 ist in ${u.einzelnoten} Einzelnoten kein einziges Mal gefallen. Sie darf vergeben werden.`,
    });
  }

  for (const s of stats) {
    if (s.korrGeschmack !== null && s.korrGeschmack > KORR_SCHWELLE) {
      out.push({
        schwere: 'warnung',
        text: `${labels[s.kriterium]} läuft zu ${komma(s.korrGeschmack)} mit dem Geschmack mit. Es misst kaum etwas Eigenes.`,
      });
    }
  }

  // Starke Zusammenhänge zwischen den übrigen Kriterien, auch gegenläufige.
  for (let i = 1; i < KRITERIEN.length; i++) {
    for (let j = i + 1; j < KRITERIEN.length; j++) {
      const a = KRITERIEN[i];
      const b = KRITERIEN[j];
      const r = korrelationZwischen(eintraege, a, b);
      if (r !== null && Math.abs(r) > KORR_SCHWELLE) {
        out.push({
          schwere: 'hinweis',
          text:
            r > 0
              ? `${labels[a]} und ${labels[b]} hängen zu ${komma(r)} zusammen. Vielleicht bewertet ihr dasselbe zweimal.`
              : `${labels[a]} und ${labels[b]} laufen gegeneinander (${komma(r)}). Gutes Personal an ungemütlichen Ständen, oder umgekehrt.`,
        });
      }
    }
  }

  const st = pegelSteigung(eintraege, gewichte);
  if (st === null) {
    out.push({
      schwere: 'hinweis',
      text: 'Ob der Pegel mitbewertet wird, lässt sich noch nicht sagen. Dafür fehlt die Becher-Nr. bei genug Einträgen.',
    });
  } else if (st.steigung > 0.25) {
    out.push({
      schwere: 'warnung',
      text: `Mit jedem weiteren Becher steigt die Note um ${komma(st.steigung)}. Ihr bewertet den Pegel, nicht den Wein.`,
    });
  } else {
    out.push({
      schwere: 'gut',
      text: 'Die Noten steigen nicht mit der Becher-Nr. Der Pegel bewertet nicht mit.',
    });
  }

  if (!out.some((b) => b.schwere === 'warnung')) {
    out.unshift({ schwere: 'gut', text: 'Keine Auffälligkeiten. Ihr nutzt die Skala brauchbar.' });
  }
  return out;
}
