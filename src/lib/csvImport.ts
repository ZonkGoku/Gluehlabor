// Import der Bestandsdaten (CSV) in Einträge. Reine Funktionen.

import { leereNoten, type Eintrag, type Kriterium } from './modell';
import { istGueltigeNote } from './scoring';

/** CSV-Spaltenname -> Kriterium. Alles andere wird direkt gemappt. */
const SPALTE_ZU_KRITERIUM: Record<string, Kriterium> = {
  geschmack: 'geschmack',
  geruch: 'geruch',
  temperatur: 'temperatur',
  personal: 'personal',
  atmosphaere: 'atmosphaere',
  preis_leistung: 'preisLeistung',
  preisleistung: 'preisLeistung',
  becher: 'becher',
};

/** Minimaler RFC-4180-Parser: Kommas, doppelte Anführungszeichen, CRLF. */
export function parseCsv(text: string): string[][] {
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let feld = '';
  let inQuotes = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"' && t[i + 1] === '"') {
        feld += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else feld += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      zeile.push(feld);
      feld = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = '';
    } else feld += c;
  }
  if (feld !== '' || zeile.length) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen.filter((z) => z.some((f) => f.trim() !== ''));
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Wandelt CSV-Text in Einträge um. Die IDs sind deterministisch
 * (`import-<saison>-<zeile>-<stand>`, oder die Spalte `id`), damit ein erneuter Import nichts
 * verdoppelt. Leere Notenzellen werden null, nie 0.
 */
export function importiereCsv(text: string): Eintrag[] {
  const [kopf, ...daten] = parseCsv(text);
  if (!kopf) return [];
  const spalten = kopf.map((s) => s.trim().toLowerCase());
  const idx = (name: string) => spalten.indexOf(name);
  for (const pflicht of ['stand', 'saison']) {
    if (idx(pflicht) < 0) throw new Error(`CSV: Spalte „${pflicht}" fehlt`);
  }

  return daten.map((felder, zeilenNr) => {
    const wert = (name: string) => {
      const i = idx(name);
      return i < 0 ? '' : (felder[i] ?? '').trim();
    };
    const stand = wert('stand');
    if (!stand) throw new Error(`CSV Zeile ${zeilenNr + 2}: Stand fehlt`);
    const saison = Number(wert('saison'));
    if (!Number.isInteger(saison)) throw new Error(`CSV Zeile ${zeilenNr + 2}: Saison ungültig`);

    const noten = leereNoten();
    spalten.forEach((spalte, i) => {
      const k = SPALTE_ZU_KRITERIUM[spalte];
      if (!k) return;
      const roh = (felder[i] ?? '').trim();
      const note = roh === '' ? null : Number(roh);
      if (!istGueltigeNote(note)) {
        throw new Error(`CSV Zeile ${zeilenNr + 2}: Note ${spalte}="${roh}" ungültig`);
      }
      noten[k] = note;
    });

    const preisRoh = wert('preis').replace(',', '.');
    const e: Eintrag = {
      // Optionale Spalte „id": hält die ID stabil, wenn ein Stand umbenannt wird (die ID hängt sonst am Namen).
      id: wert('id') || `import-${saison}-${String(zeilenNr + 1).padStart(3, '0')}-${slug(stand)}`,
      stand,
      markt: wert('markt') || 'Sonstiger',
      saison,
      noten,
      erstelltAm: Date.UTC(saison, 11, 1),
    };
    if (wert('stadt')) e.stadt = wert('stadt');
    if (wert('datum')) e.datum = wert('datum');
    if (preisRoh) e.preis = Number(preisRoh);
    if (wert('notiz')) e.notiz = wert('notiz');
    return e;
  });
}
