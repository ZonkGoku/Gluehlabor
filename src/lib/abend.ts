// Hilfen rund um „den Abend": Datum und Becher-Nr. Reine Funktionen.

/**
 * Datum des Abends als yyyy-mm-dd in Ortszeit. Bis 5 Uhr morgens zählt
 * noch der Vortag: Der vierte Becher um 0:30 gehört zum selben Abend.
 */
export function abendDatum(jetzt: Date): string {
  const d = new Date(jetzt.getTime());
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Vorschlag für die Becher-Nr.: höchste Nr. dieses Abends + 1, maximal 7. */
export function naechsteBecherNr(
  eintraege: readonly { datum?: string; becherNr?: number }[],
  datum: string,
): number {
  const max = eintraege
    .filter((e) => e.datum === datum && typeof e.becherNr === 'number')
    .reduce((m, e) => Math.max(m, e.becherNr!), 0);
  return Math.min(max + 1, 7);
}
