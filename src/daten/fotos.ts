// Fotos der Community: freigeben, wieder privat machen, Adresse. Hochgeladen wird im Abgleich (sync.ts, sendeFotos).
import { api } from './api';
import { API_BASIS } from './config';
import { db, holeGeraet, type LokalerEintrag } from './db';
import { synchronisiere } from './sync';

/** Adresse des Fotos beim Server (groß oder als kleine Vorschau); undefined, wenn dort keins liegt. */
export function fotoAdresse(e: Pick<LokalerEintrag, 'foto'>, klein = false): string | undefined {
  if (!e.foto) return undefined;
  return `${API_BASIS}${e.foto}${klein ? '&g=klein' : ''}`;
}

/** Das Foto dieser eigenen Bewertung für alle sichtbar machen (der Bewertende stimmt ausdrücklich zu). Der Upload folgt beim nächsten Abgleich. */
export async function macheFotoOeffentlich(id: string): Promise<void> {
  await db.eintraege.update(id, { fotoOeffentlich: true, fotoFehler: undefined });
  void synchronisiere();
}

/** Das Foto wieder privat machen: beim Server löschen (falls dort) und nur auf diesem Gerät behalten. */
export async function macheFotoPrivat(id: string): Promise<void> {
  const e = await db.eintraege.get(id);
  if (e && (e.fotoHochgeladen || e.foto)) {
    await api('/api/foto/loeschen', { methode: 'POST', geraet: await holeGeraet(), body: { id } });
  }
  await db.eintraege.update(id, { fotoOeffentlich: false, fotoHochgeladen: undefined, foto: undefined });
}

/** Foto ganz löschen (auch auf diesem Gerät). */
export async function loescheFoto(id: string): Promise<void> {
  await macheFotoPrivat(id).catch(() => undefined);
  await db.eintraege.update(id, { fotoBlob: undefined, fotoOeffentlich: false, fotoHochgeladen: undefined, foto: undefined });
}
