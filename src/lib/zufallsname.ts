// Namensvorschlag für Neulinge: ein Tipp statt Tippen („Zimtiger Igel 42"). Alle Kombinationen sind gültige Namen (Test) und höchstens 24 Zeichen.
const ADJEKTIVE = ['Zimtiger', 'Flotter', 'Warmer', 'Frostiger', 'Lustiger', 'Gemütlicher', 'Feuriger', 'Schlauer', 'Sanfter', 'Mutiger'] as const;
const TIERE = ['Fuchs', 'Bär', 'Hase', 'Pinguin', 'Igel', 'Elch', 'Luchs', 'Dachs', 'Uhu', 'Otter'] as const;

/** `zufall` liefert Zahlen in [0, 1), austauschbar für Tests. */
export function zufallsname(zufall: () => number = Math.random): string {
  const a = ADJEKTIVE[Math.floor(zufall() * ADJEKTIVE.length)];
  const t = TIERE[Math.floor(zufall() * TIERE.length)];
  const n = 10 + Math.floor(zufall() * 90);
  return `${a} ${t} ${n}`;
}

export const ALLE_ZUFALLSNAMEN_TEILE = { ADJEKTIVE, TIERE };
