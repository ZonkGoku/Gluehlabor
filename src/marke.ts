// Name und Auftritt des Produkts an einer Stelle. Ändert sich der Name, ändert sich er hier
// (und in index.html, vite.config.ts und public/logo.png, die keine TypeScript-Importe nutzen können).
export const MARKE = {
  name: 'Glühlabor',
  claim: 'Prüfstelle für Glühwein',
  domain: 'gluehlabor.de',
} as const;
