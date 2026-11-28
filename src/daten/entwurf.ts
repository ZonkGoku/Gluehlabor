// Halbfertige Erfassung. Android beendet Apps im Hintergrund gern; wer zwischen
// zwei Noten das Telefon wegsteckt, findet beim Zurückkommen alles wieder.

import type { Noten, Sorte } from '../lib/modell';
import { db } from './db';

export interface Entwurf {
  stand: string;
  markt: string;
  marktFrei: boolean;
  sorte?: Sorte;
  becherNr?: number;
  preis?: number;
  /** Größe der Tasse in Litern; ohne Angabe 0,2 l. */
  menge?: number;
  notiz: string;
  /** Schnell-Tags (lib/tags.ts) */
  tags?: string[];
  noten: Noten;
  /** Stadt, wenn sie feststeht (z. B. aus einem QR-Code). */
  stadt?: string;
  /** Gemeinsamer Besuch an dieser Bude (QR-Code). Wird beim ersten Teilen oder Scannen vergeben. */
  besuchId?: string;
  /** Stand und Markt stammen aus einem gescannten Besuch und sind nicht änderbar. */
  gesperrt?: boolean;
}

/** Hat der Entwurf Inhalt, der beim Überschreiben verloren ginge? */
export function entwurfHatInhalt(e: Entwurf | null): boolean {
  if (!e) return false;
  return Boolean(e.stand.trim()) || Object.values(e.noten).some((n) => n !== null) || Boolean(e.notiz.trim());
}

const KEY = 'gluehlabor.entwurf';

export function leseEntwurf(): Entwurf | null {
  try {
    const roh = localStorage.getItem(KEY);
    return roh ? (JSON.parse(roh) as Entwurf) : null;
  } catch {
    return null;
  }
}

export function schreibeEntwurf(e: Entwurf | null): void {
  try {
    if (e) localStorage.setItem(KEY, JSON.stringify(e));
    else localStorage.removeItem(KEY);
  } catch {
    /* privater Modus o. Ä.: dann eben ohne Entwurf */
  }
}

/** Foto des Entwurfs liegt in IndexedDB, weil es für localStorage zu groß ist. */
export async function schreibeEntwurfFoto(b: Blob | null): Promise<void> {
  if (b) await db.einstellungen.put({ key: 'entwurfFoto', wert: b });
  else await db.einstellungen.delete('entwurfFoto');
}

export async function leseEntwurfFoto(): Promise<Blob | null> {
  const e = await db.einstellungen.get('entwurfFoto');
  return e?.wert instanceof Blob ? e.wert : null;
}
