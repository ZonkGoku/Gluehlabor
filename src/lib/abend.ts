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

/**
 * Die Becher-Nr. zählt das System: so viele Bewertungen wie dieses Gerät heute schon hat, plus eine (mindestens die höchste vergebene Nr. + 1),
 * höchstens 7 (mehr nimmt der Server nicht an). `eintraege` sind nur die eigenen Bewertungen, nie die der Community.
 */
export function naechsteBecherNr(
  eintraege: readonly { datum?: string; becherNr?: number }[],
  datum: string,
): number {
  const heute = eintraege.filter((e) => e.datum === datum);
  const max = heute.reduce((m, e) => (typeof e.becherNr === 'number' ? Math.max(m, e.becherNr) : m), 0);
  return Math.min(Math.max(max, heute.length) + 1, 7);
}
