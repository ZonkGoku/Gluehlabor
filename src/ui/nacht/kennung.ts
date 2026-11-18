/** Kurze, stabile Kennung aus der ID für den Stummel (#3F2A). */
export function kurzId(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}
