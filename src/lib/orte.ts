// Märkte und Städte. Bewertet wird in ganz Deutschland; gepflegte Listen gibt es
// je Stadt (data/maerkte.json), frei eingegebene Märkte sind erlaubt. Reine Funktionen.

export interface MarktListe {
  sonstiger: string;
  staedte: { stadt: string; maerkte: string[] }[];
}

/** Alle gepflegten Märkte in Listenreihenfolge, „Sonstiger" am Ende. */
export function alleMaerkte(liste: MarktListe): string[] {
  return [...liste.staedte.flatMap((s) => s.maerkte), liste.sonstiger];
}

/** Stadt eines gepflegten Markts, sonst null. */
export function stadtZuMarkt(liste: MarktListe, markt: string): string | null {
  return liste.staedte.find((s) => s.maerkte.includes(markt))?.stadt ?? null;
}

/** Stadt eines Eintrags: ausdrücklich gesetzt, sonst aus der gepflegten Liste, sonst null. */
export function stadtVon(liste: MarktListe, e: { markt: string; stadt?: string }): string | null {
  return e.stadt?.trim() || stadtZuMarkt(liste, e.markt);
}

/**
 * Freie Eingabe „Markt, Stadt" zerlegen. Ohne Komma ist alles der Markt.
 * „Christkindlesmarkt, Nürnberg" → { markt: "Christkindlesmarkt", stadt: "Nürnberg" }
 */
export function zerlegeFreienMarkt(eingabe: string): { markt: string; stadt?: string } {
  const i = eingabe.lastIndexOf(',');
  if (i < 0) return { markt: eingabe.trim() };
  const markt = eingabe.slice(0, i).trim();
  const stadt = eingabe.slice(i + 1).trim();
  if (!markt) return { markt: stadt };
  return stadt ? { markt, stadt } : { markt };
}

export interface StadtStand {
  stadt: string | null;
  becher: number;
  maerkte: number;
}

/** Becher und besuchte Märkte je Stadt, meistbesuchte zuerst. null = Stadt unbekannt. */
export function staedte(liste: MarktListe, eintraege: readonly { markt: string; stadt?: string }[]): StadtStand[] {
  const m = new Map<string | null, { becher: number; maerkte: Set<string> }>();
  for (const e of eintraege) {
    const s = stadtVon(liste, e);
    const x = m.get(s) ?? { becher: 0, maerkte: new Set<string>() };
    x.becher++;
    x.maerkte.add(e.markt);
    m.set(s, x);
  }
  return [...m.entries()]
    .map(([stadt, x]) => ({ stadt, becher: x.becher, maerkte: x.maerkte.size }))
    .sort((a, b) => (a.stadt === null ? 1 : 0) - (b.stadt === null ? 1 : 0) || b.becher - a.becher);
}
