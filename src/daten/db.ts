// Lokaler Speicher (IndexedDB über Dexie). Das ist die Wahrheit der App:
// Alles wird zuerst hier gespeichert, das Netz kommt danach.

import Dexie, { type Table } from 'dexie';
import bestand2025 from '../../data/gluehwein-2025.csv?raw';
import { importiereCsv } from '../lib/csvImport';
import { DEFAULT_GEWICHTE, type Eintrag, type Gewichte } from '../lib/modell';

/**
 * offen   – lokal erfasst, noch nicht im Repo
 * fertig  – im Repo (selbst hochgeladen oder vom anderen Gerät geholt)
 * bestand – aus einer CSV im Repo importiert
 */
export type SyncStatus = 'offen' | 'fertig' | 'bestand';

export interface LokalerEintrag extends Eintrag {
  sync: SyncStatus;
  /** Foto, solange es noch nicht hochgeladen ist. */
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
  await db.eintraege.add({ ...e, sync: 'offen', ...(fotoBlob ? { fotoBlob } : {}) });
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* nicht kritisch */
  }
}
