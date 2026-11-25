// Stammdaten aus data/: Anker, Märkte, Regeln. Nur Laden und Typisieren.
import ankerJson from '../../data/anker.json';
import maerkteJson from '../../data/maerkte.json';
import regelnJson from '../../data/regeln.json';
import type { AnkerDaten } from '../lib/anker';
import { alleMaerkte, type MarktListe } from '../lib/orte';
import { KRITERIEN, type Kriterium } from '../lib/modell';

export const ANKER = ankerJson as unknown as AnkerDaten;
import osmJson from '../../data/maerkte-osm.json';

/** Zusätzliche Märkte je Stadt aus OpenStreetMap (leer, bis der Workflow „Märkte aktualisieren" gelaufen ist). */
export const MARKT_ZUSATZ = (osmJson as { staedte: Record<string, string[]> }).staedte;
export const MARKTLISTE = maerkteJson as MarktListe;
export const MAERKTE = alleMaerkte(MARKTLISTE);
export const REGELN = regelnJson as string[];
export const LABELS = Object.fromEntries(KRITERIEN.map((k) => [k, ANKER[k].label])) as Record<Kriterium, string>;
