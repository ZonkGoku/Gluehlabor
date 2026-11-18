// Zugriff auf den Community-Server. Netzfehler werfen einen TypeError (kein Netz),
// Antworten mit Fehlercode einen ApiFehler.

import { API_URL } from './config';
import type { Geraet } from './db';

export class ApiFehler extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Optionen {
  methode?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  geraet?: Geraet;
}

export async function api<T>(pfad: string, o: Optionen = {}): Promise<T> {
  const kopf: Record<string, string> = {};
  if (o.body !== undefined) kopf['Content-Type'] = 'application/json';
  if (o.geraet) kopf.Authorization = `Bearer ${o.geraet.id}.${o.geraet.schluessel}`;
  const res = await fetch(API_URL + pfad, {
    method: o.methode ?? 'GET',
    headers: kopf,
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const text = await res.text();
  let daten: unknown = null;
  try {
    daten = text ? JSON.parse(text) : null;
  } catch {
    /* kein JSON */
  }
  if (!res.ok) {
    const grund = (daten as { fehler?: string } | null)?.fehler ?? `Serverfehler ${res.status}`;
    throw new ApiFehler(res.status, grund);
  }
  return daten as T;
}
