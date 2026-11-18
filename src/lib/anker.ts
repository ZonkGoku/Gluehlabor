// Auswahl der Ankerdefinitionen zu einer Note. Reine Funktion; die Texte
// selbst liegen in data/anker.json.

import type { Kriterium, Note } from './modell';
import { t } from '../i18n';

export interface AnkerKriterium {
  label: string;
  zusatz?: string;
  anker: Record<string, string>;
}
export type AnkerDaten = Record<Kriterium, AnkerKriterium>;

export interface AnkerZeile {
  stufe: number;
  text: string;
}

/**
 * Liefert die Anker, die zu einer Note passen:
 * - Note trifft einen Anker genau: nur dieser.
 * - Note liegt zwischen zwei Ankern: beide, der obere zuerst.
 * - Keine Note: die Skalenenden (oberster und unterster Anker).
 */
export function ankerFuer(def: AnkerKriterium, note: Note): AnkerZeile[] {
  const stufen = Object.keys(def.anker)
    .map(Number)
    .filter((s) => Number.isFinite(s))
    .sort((a, b) => b - a);
  if (stufen.length === 0) return [];
  const zeile = (s: number) => ({ stufe: s, text: t(def.anker[String(s)]) });

  if (note === null) {
    const oben = stufen[0];
    const unten = stufen[stufen.length - 1];
    return oben === unten ? [zeile(oben)] : [zeile(oben), zeile(unten)];
  }
  if (stufen.includes(note)) return [zeile(note)];
  const drueber = stufen.filter((s) => s > note).at(-1);
  const drunter = stufen.find((s) => s < note);
  return [drueber, drunter].filter((s): s is number => s !== undefined).map(zeile);
}
