// Lokaler Speicher (IndexedDB über Dexie). Das ist die Wahrheit der App:
// Alles wird zuerst hier gespeichert, das Netz kommt danach.

import Dexie, { type Table } from 'dexie';
import bestand2025 from '../../data/gluehwein-2025.csv?raw';
import { importiereCsv } from '../lib/csvImport';
import { DEFAULT_GEWICHTE, type Eintrag, type Gewichte } from '../lib/modell';

/**
 * offen     – lokal erfasst, noch nicht beim Server
 * fertig    – beim Server (selbst gesendet oder von dort geholt)
 * bestand   – aus der mitgelieferten CSV importiert
 * abgelehnt – der Server hat den Becher nicht angenommen (Grund in syncFehler)
 */
export type SyncStatus = 'offen' | 'fertig' | 'bestand' | 'abgelehnt';

export interface LokalerEintrag extends Eintrag {
  sync: SyncStatus;
  /** Foto des Bechers. Bleibt vorerst auf dem Gerät; der Server nimmt noch keine Fotos an. */
  fotoBlob?: Blob;
  syncFehler?: string;
}

export interface Einstellung {
  key: string;
  wert: unknown;
}

class BecherwerkDb extends Dexie {
  eintraege!: Table<LokalerEintrag, string>;
  einstellungen!: Table<Einstellung, string>;

  constructor() {
    super('becherwerk');
    this.version(1).stores({
      eintraege: 'id, sync, saison, markt, datum, erstelltAm',
      einstellungen: 'key',
    });
    // Beim allerersten Öffnen: Bestandsdaten importieren, damit die App nicht leer startet.
    this.on('populate', (tx) => {
      const eintraege = importiereCsv(bestand2025).map((e) => ({ ...e, sync: 'bestand' as const }));
      tx.table('eintraege').bulkAdd(eintraege);
    });
  }
}

export const db = new BecherwerkDb();

export async function leseEinstellung<T>(key: string, fallback: T): Promise<T> {
  const e = await db.einstellungen.get(key);
  return e === undefined ? fallback : (e.wert as T);
}

export async function schreibeEinstellung(key: string, wert: unknown): Promise<void> {
  await db.einstellungen.put({ key, wert });
}

export const leseGewichte = () => leseEinstellung<Gewichte>('gewichte', { ...DEFAULT_GEWICHTE });

/**
 * Speichert einen neu erfassten Becher. Erst wenn diese Funktion zurückkehrt,
 * meldet die Oberfläche „gespeichert". Bittet den Browser außerdem, den
 * Speicher nicht bei Platzmangel zu räumen.
 */
export async function speichereNeuenEintrag(e: Eintrag, fotoBlob?: Blob): Promise<void> {
  const geraet = await holeGeraet();
  const name = await leseEinstellung<string>('name', '');
  await db.eintraege.add({
    ...e,
    geraet: geraet.id,
    ...(name ? { name } : {}),
    sync: 'offen',
    ...(fotoBlob ? { fotoBlob } : {}),
  });
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* nicht kritisch */
  }
}

export interface Geraet {
  id: string;
  schluessel: string;
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function neueUuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let geraetLaeuft: Promise<Geraet> | null = null;

/**
 * Anonyme Kennung und Schlüssel dieses Geräts. Beides entsteht beim ersten Bedarf
 * auf dem Gerät selbst, auch ohne Netz. Der Server lernt sie erst beim ersten Sync kennen.
 */
export function holeGeraet(): Promise<Geraet> {
  geraetLaeuft ??= (async () => {
    const vorhanden = await leseEinstellung<Geraet | null>('geraet', null);
    if (vorhanden) return vorhanden;
    const neu = { id: neueUuid(), schluessel: hex(crypto.getRandomValues(new Uint8Array(32))) };
    await schreibeEinstellung('geraet', neu);
    return neu;
  })();
  return geraetLaeuft;
}

/** Name ändern. Er geht beim nächsten Sync zum Server; ohne Netz gilt er zunächst nur lokal. */
export async function setzeName(name: string): Promise<void> {
  await schreibeEinstellung('name', name);
  await schreibeEinstellung('nameGesendet', false);
}
