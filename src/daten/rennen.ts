// Schlittenfahren: Zugriff auf den Server und die Liste der eigenen Rennen (nur auf diesem Gerät gemerkt).
import { api } from './api';
import { leseEinstellung, schreibeEinstellung } from './db';
import { sorgeFuerAnmeldung } from './sync';
import type { Rennen, Teilnehmer } from '../lib/rennen';

export interface RennenDaten {
  rennen: Rennen;
  teilnehmer: Teilnehmer[];
}

export const ladeRennen = (id: string) => api<RennenDaten>(`/api/rennen/${id}`);

export async function legeRennenAn(name: string, ziel: number, kamel: string, farbe: number, fahrzeug = 0): Promise<string> {
  const geraet = await sorgeFuerAnmeldung();
  const r = await api<{ id: string }>('/api/rennen', { methode: 'POST', geraet, body: { name, ziel, kamel, farbe, fahrzeug } });
  await merkeRennen(r.id);
  return r.id;
}

export async function trittBei(id: string, kamel: string, farbe: number, fahrzeug = 0): Promise<void> {
  const geraet = await sorgeFuerAnmeldung();
  await api('/api/rennen/beitreten', { methode: 'POST', geraet, body: { id, kamel, farbe, fahrzeug } });
  await merkeRennen(id);
}

export async function verlasseRennen(id: string): Promise<void> {
  const geraet = await sorgeFuerAnmeldung();
  await api('/api/rennen/verlassen', { methode: 'POST', geraet, body: { id } });
  await vergissRennen(id);
}

export async function loescheRennen(id: string): Promise<void> {
  const geraet = await sorgeFuerAnmeldung();
  await api('/api/rennen/loeschen', { methode: 'POST', geraet, body: { id } });
  await vergissRennen(id);
}

export const meineRennen = () => leseEinstellung<string[]>('rennen', []);

export async function merkeRennen(id: string): Promise<void> {
  const liste = await meineRennen();
  if (!liste.includes(id)) await schreibeEinstellung('rennen', [id, ...liste].slice(0, 20));
}

export async function vergissRennen(id: string): Promise<void> {
  await schreibeEinstellung('rennen', (await meineRennen()).filter((x) => x !== id));
}

/** Letzte Wahl für Schlittenname und Farbe, damit man sie nicht jedes Mal neu eingeben muss. */
export const letztesKamel = () => leseEinstellung<{ name: string; farbe: number; fahrzeug?: number } | null>('kamel', null);
export const merkeKamel = (name: string, farbe: number, fahrzeug = 0) => schreibeEinstellung('kamel', { name, farbe, fahrzeug });

// ───────── Vorbelegung: ein Tipp zum Losfahren ─────────

/** Zuletzt gewählter Schlitten, sonst Name des Spielers mit zufälliger Farbe. */
export async function standardSchlitten(): Promise<{ name: string; farbe: number; fahrzeug: number }> {
  const k = await letztesKamel();
  if (k) return { name: k.name, farbe: k.farbe, fahrzeug: k.fahrzeug ?? 0 };
  const n = (await leseEinstellung<string>('name', '')).trim();
  return { name: n.length >= 2 ? n.slice(0, 24) : 'Schlitten', farbe: Math.floor(Math.random() * 8), fahrzeug: 0 };
}

/** Legt ein Rennen mit allem Vorbelegten an (Name „Rennen von …“, 5 Schritte). Liefert die Kennung. */
export async function schnellRennen(): Promise<string> {
  const s = await standardSchlitten();
  const n = (await leseEinstellung<string>('name', '')).trim();
  const id = await legeRennenAn(n.length >= 2 ? `Rennen von ${n.slice(0, 13)}` : 'Mein Rennen', 5, s.name, s.farbe, s.fahrzeug);
  await merkeKamel(s.name, s.farbe, s.fahrzeug);
  return id;
}

/** Fährt mit dem vorbelegten Schlitten mit (ein Tipp). */
export async function trittMitStandardBei(id: string): Promise<void> {
  const s = await standardSchlitten();
  await trittBei(id, s.name, s.farbe, s.fahrzeug);
  await merkeKamel(s.name, s.farbe, s.fahrzeug);
}
