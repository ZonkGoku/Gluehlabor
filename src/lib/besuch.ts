// Gemeinsamer Besuch an einer Bude. Der QR-Code trägt nur die Stammdaten (Stand, Markt,
// Stadt, Sorte) und eine kurze Besuchs-Nr., keine Bewertung. Der Link funktioniert ohne Netz.
// Reine Funktionen.

import { GRENZEN, pruefeText, STADT_MUSTER } from './community';
import { SORTEN, type Sorte } from './modell';

export interface Besuch {
  id: string;
  stand: string;
  markt: string;
  stadt?: string;
  sorte?: Sorte;
}

const ID = /^[A-Za-z0-9_-]{4,32}$/;
// ohne leicht verwechselbare Zeichen (0/o, 1/l/i)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Besuchs-Nr. aus Zufallsbytes. Sie gruppiert nur, sie ist kein Geheimnis. */
export function besuchIdAusBytes(bytes: Uint8Array): string {
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Link, der beim Scannen die App mit dem Besuch öffnet. `basis` ist die Adresse der App ohne #. */
export function besuchsLink(basis: string, b: Besuch): string {
  const q = new URLSearchParams();
  q.set('b', b.id);
  q.set('s', b.stand);
  q.set('m', b.markt);
  if (b.stadt) q.set('c', b.stadt);
  if (b.sorte) q.set('t', b.sorte);
  // URLSearchParams schreibt Leerzeichen als "+"; %20 ist in QR-Codes robuster.
  return `${basis.replace(/#.*$/, '')}#/mitbewerten?${q.toString().replace(/\+/g, '%20')}`;
}

export type BesuchPruefung = { ok: true; besuch: Besuch } | { ok: false; grund: string };

/** Liest einen Besuch aus dem Teil nach dem "?" im Link. Alles Fremde wird geprüft wie eine Einreichung. */
export function leseBesuch(query: string): BesuchPruefung {
  const q = new URLSearchParams(query.replace(/^\?/, ''));
  const id = q.get('b') ?? '';
  if (!ID.test(id)) return { ok: false, grund: 'Der Link ist unvollständig.' };
  const stand = pruefeText(q.get('s'), 'Stand', GRENZEN.stand, true);
  if (!stand.ok) return { ok: false, grund: 'Der Link ist ungültig.' };
  const markt = pruefeText(q.get('m'), 'Markt', GRENZEN.markt, true);
  if (!markt.ok) return { ok: false, grund: 'Der Link ist ungültig.' };
  const stadt = pruefeText(q.get('c'), 'Stadt', GRENZEN.stadt, false);
  if (!stadt.ok || (stadt.wert && !STADT_MUSTER.test(stadt.wert))) return { ok: false, grund: 'Der Link ist ungültig.' };
  const sorte = q.get('t');
  if (sorte && !(SORTEN as readonly string[]).includes(sorte)) return { ok: false, grund: 'Der Link ist ungültig.' };
  const besuch: Besuch = { id, stand: stand.wert!, markt: markt.wert! };
  if (stadt.wert) besuch.stadt = stadt.wert;
  if (sorte) besuch.sorte = sorte as Sorte;
  return { ok: true, besuch };
}
