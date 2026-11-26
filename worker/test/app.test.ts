import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../src/app';
import { leereNoten } from '../../src/lib/modell';
import { neuerEnv, ruft as handle, zielStart, zielStop, ZIEL } from './ziel';

const JETZT = Date.parse('2026-12-05T20:00:00Z');
const SITE = 'https://zonkgoku.github.io';
const ADMIN = 'admin-geheimnis';
const CODE = 'prüfstellen-geheimnis';

let env: Env;
beforeAll(zielStart);
afterAll(zielStop);
beforeEach(() => {
  env = neuerEnv({ ADMIN_TOKEN: ADMIN, PRUEFSTELLE_CODE: CODE, ERLAUBTE_URSPRUENGE: `${SITE},http://localhost:4173` });
});
// Diese beiden prüfen Funktionen der TypeScript-Fassung direkt (die PHP-Fassung hat eigene Prüfung in php/test).
const nurTs = ZIEL === 'ts' ? it : it.skip;

interface Opt {
  body?: unknown;
  auth?: string;
  ip?: string;
  origin?: string | null;
  jetzt?: number;
  roh?: string;
}

async function ruf(methode: string, pfad: string, o: Opt = {}) {
  const kopf: Record<string, string> = { 'CF-Connecting-IP': o.ip ?? '1.1.1.1' };
  if (o.auth) kopf.Authorization = `Bearer ${o.auth}`;
  if (o.origin !== null) kopf.Origin = o.origin ?? SITE;
  if (o.body !== undefined || o.roh !== undefined) kopf['Content-Type'] = 'application/json';
  const res = await handle(
    new Request(`https://api.test${pfad}`, {
      method: methode,
      headers: kopf,
      body: o.roh ?? (o.body === undefined ? undefined : JSON.stringify(o.body)),
    }),
    env,
    o.jetzt ?? JETZT,
  );
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leer */
  }
  return { status: res.status, json, kopf: res.headers };
}

const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Neues Gerät anmelden. Liefert den Bearer-Wert. Standardmäßig mit Namen: ohne Namen nimmt der Server keine Bewertung an. */
async function geraet(o: Opt & { name?: string | null } = {}) {
  const id = crypto.randomUUID();
  const schluessel = hex(32);
  const { name = 'Tester', ...rest } = o;
  const r = await ruf('POST', '/api/geraete', { ...rest, body: { id, schluessel } });
  expect(r.status).toBe(201);
  const auth = `${id}.${schluessel}`;
  if (name) expect((await ruf('PUT', '/api/ich', { ...rest, auth, body: { name } })).status).toBe(200);
  return { id, schluessel, auth };
}

let zaehler = 0;
const becher = (patch: Record<string, unknown> = {}) => ({
  id: `becher-${++zaehler}-${hex(4)}`,
  stand: `Glühweinkönig ${zaehler}`,
  markt: 'Christkindlesmarkt',
  stadt: 'Nürnberg',
  saison: 2026,
  datum: '2026-12-05',
  noten: { ...leereNoten(), geschmack: 8, geruch: 7 },
  preis: 4.5,
  erstelltAm: JETZT - 5000,
  ...patch,
});

const sende = (g: { auth: string }, eintraege: unknown[], o: Opt = {}) => ruf('POST', '/api/becher', { ...o, auth: g.auth, body: { eintraege } });
const liste = (query = '', o: Opt = {}) => ruf('GET', `/api/becher${query}`, o);

describe('Kamelrennen', () => {
  const neu = (g: { auth: string }, patch: Record<string, unknown> = {}) =>
    ruf('POST', '/api/rennen', { auth: g.auth, body: { name: 'Feierabendrennen', ziel: 20, kamel: 'Blitz', farbe: 2, ...patch } });

  it('anlegen: Ersteller läuft gleich mit, jeder kann das Rennen lesen', async () => {
    const g = await geraet();
    const r = await neu(g);
    expect(r.status).toBe(201);
    expect(r.json.id).toMatch(/^[a-z0-9]{8}$/);
    const l = await ruf('GET', `/api/rennen/${r.json.id}`, { origin: null });
    expect(l.status).toBe(200);
    expect(l.json.rennen).toMatchObject({ id: r.json.id, name: 'Feierabendrennen', ziel: 20 });
    expect(l.json.rennen.ende).toBeGreaterThan(JETZT);
    expect(l.json.teilnehmer).toEqual([{ geraet: g.id, kamel: 'Blitz', farbe: 2, seit: JETZT }]);
    expect(l.kopf.get('access-control-allow-origin')).toBe('*');
  });
  it('anlegen braucht Anmeldung, Namen, ein erlaubtes Ziel und eine Farbe', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/rennen', { body: { name: 'x', ziel: 20, kamel: 'y', farbe: 0 } })).status).toBe(401);
    expect((await neu(g, { name: '' })).status).toBe(422);
    expect((await neu(g, { kamel: null })).status).toBe(422);
    expect((await neu(g, { ziel: 7 })).status).toBe(400);
    expect((await neu(g, { farbe: 9 })).status).toBe(400);
    expect((await neu(g, { farbe: 1.5 })).status).toBe(400);
    expect((await neu(g, { name: 'http://böse.de' })).status).toBe(422);
  });
  it('höchstens 5 neue Rennen je Gerät und Tag', async () => {
    const g = await geraet();
    for (let i = 0; i < 5; i++) expect((await neu(g)).status).toBe(201);
    expect((await neu(g)).status).toBe(429);
  });
  it('beitreten: einmal je Gerät, doppelt ist harmlos, Kamel bleibt wie gewählt', async () => {
    const a = await geraet();
    const b = await geraet();
    const id = (await neu(a)).json.id;
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: b.auth, body: { id, kamel: 'Sandy', farbe: 4 } })).status).toBe(200);
    const nochmal = await ruf('POST', '/api/rennen/beitreten', { auth: b.auth, body: { id, kamel: 'Anders', farbe: 5 } });
    expect(nochmal.json.schon).toBe(true);
    const l = await ruf('GET', `/api/rennen/${id}`);
    expect(l.json.teilnehmer.map((t: any) => t.kamel).sort()).toEqual(['Blitz', 'Sandy']);
  });
  it('beitreten: unbekanntes Rennen 404, ungültige Angaben 400/422', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id: 'abcdefgh', kamel: 'Xi', farbe: 0 } })).status).toBe(404);
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id: '../../x', kamel: 'Xi', farbe: 0 } })).status).toBe(400);
    const id = (await neu(await geraet())).json.id;
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id, kamel: '', farbe: 0 } })).status).toBe(422);
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id, kamel: 'Xi', farbe: -1 } })).status).toBe(400);
  });
  it('vorbei: kein Beitritt mehr; voll bei 12 Teilnehmern', async () => {
    const id = (await neu(await geraet())).json.id;
    const spaet = JETZT + 15 * 24 * 3600_000;
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: (await geraet({ jetzt: spaet })).auth, jetzt: spaet, body: { id, kamel: 'Spaet', farbe: 0 } })).status).toBe(410);
    for (let i = 0; i < 11; i++) {
      const g = await geraet({ ip: `9.9.${i}.1` });
      expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id, kamel: `K${i}`, farbe: i % 8 } })).status).toBe(200);
    }
    const g = await geraet({ ip: '9.9.99.1' });
    expect((await ruf('POST', '/api/rennen/beitreten', { auth: g.auth, body: { id, kamel: 'Zu viel', farbe: 0 } })).status).toBe(409);
  });
  it('unbekanntes oder kaputtes Rennen lesen: 404', async () => {
    expect((await ruf('GET', '/api/rennen/abcdefgh')).status).toBe(404);
    expect((await ruf('GET', '/api/rennen/x')).status).toBe(404);
  });
});

describe('Status', () => {
  it('antwortet', async () => {
    const r = await ruf('GET', '/api/status');
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
  });
  it('unbekannte Adresse: 404', async () => expect((await ruf('GET', '/api/nix')).status).toBe(404));
  it('kaputtes JSON: 400', async () => expect((await ruf('POST', '/api/geraete', { roh: '{kaputt' })).status).toBe(400));
  it('zu große Anfrage: 413', async () => {
    const r = await ruf('POST', '/api/geraete', { body: { id: 'x'.repeat(70_000) } });
    expect(r.status).toBe(413);
  });
});

describe('Gerät anmelden', () => {
  it('legt ein Gerät an; der Server speichert nur den Hash', async () => {
    const g = await geraet();
    const z = await env.DB.prepare('SELECT * FROM geraete WHERE id = ?').bind(g.id).first<{ schluessel_hash: string }>();
    expect(z?.schluessel_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(z?.schluessel_hash).not.toBe(g.schluessel);
  });
  it('dieselbe Kennung zweimal: 409', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/geraete', { body: { id: g.id, schluessel: hex(32) } })).status).toBe(409);
  });
  it.each([
    ['Kennung zu kurz', { id: 'kurz', schluessel: 'a'.repeat(64) }],
    ['Kennung mit Sonderzeichen', { id: '../../etc/passwd-aaaaaaaa', schluessel: 'a'.repeat(64) }],
    ['Schlüssel zu kurz', { id: crypto.randomUUID(), schluessel: 'abc' }],
    ['Schlüssel nicht hex', { id: crypto.randomUUID(), schluessel: 'z'.repeat(64) }],
  ])('lehnt ab: %s', async (_n, body) => expect((await ruf('POST', '/api/geraete', { body })).status).toBe(400));

  it('begrenzt neue Geräte je Adresse und Stunde, andere Adressen bleiben frei', async () => {
    for (let i = 0; i < 150; i++) await geraet({ ip: '9.9.9.9', name: null });
    const r = await ruf('POST', '/api/geraete', { ip: '9.9.9.9', body: { id: crypto.randomUUID(), schluessel: hex(32) } });
    expect(r.status).toBe(429);
    await geraet({ ip: '8.8.8.8', name: null });
    // eine Stunde später geht es wieder
    const spaeter = await ruf('POST', '/api/geraete', { ip: '9.9.9.9', jetzt: JETZT + 61 * 60_000, body: { id: crypto.randomUUID(), schluessel: hex(32) } });
    expect(spaeter.status).toBe(201);
  });
});

describe('Anmeldung bei Aufrufen', () => {
  it('ohne Anmeldung: 401', async () => expect((await ruf('GET', '/api/ich')).status).toBe(401));
  it('falscher Schlüssel: 401', async () => {
    const g = await geraet();
    expect((await ruf('GET', '/api/ich', { auth: `${g.id}.${hex(32)}` })).status).toBe(401);
  });
  it('unbekannte Kennung: 401', async () => {
    expect((await ruf('GET', '/api/ich', { auth: `${crypto.randomUUID()}.${hex(32)}` })).status).toBe(401);
  });
  it('Schrott im Header: 401', async () => expect((await ruf('GET', '/api/ich', { auth: 'irgendwas' })).status).toBe(401));
  it('liefert die eigenen Daten', async () => {
    const g = await geraet();
    const r = await ruf('GET', '/api/ich', { auth: g.auth });
    expect(r.json).toEqual({ id: g.id, name: 'Tester', pruefstelle: false });
  });
});

describe('Name', () => {
  it('setzen, ändern, löschen', async () => {
    const g = await geraet();
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: '  Anna  K. ' } })).json.name).toBe('Anna K.');
    expect((await ruf('GET', '/api/ich', { auth: g.auth })).json.name).toBe('Anna K.');
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: '' } })).json.name).toBeNull();
    expect((await ruf('GET', '/api/ich', { auth: g.auth })).json.name).toBeNull();
  });
  it.each(['http://spam.de', 'www.spam.de', 'x'.repeat(40), 'Admin', 'David', '<b>'])('lehnt %s ab', async (name) => {
    const g = await geraet();
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name } })).status).toBe(422);
  });
  it('der Name steht zum Zeitpunkt des Bewertens an der Bewertung, spätere Änderungen betreffen alte Becher nicht', async () => {
    const g = await geraet();
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Anna' } });
    await sende(g, [becher({ id: 'alt-12345678' })]);
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Berta' } });
    await sende(g, [becher({ id: 'neu-12345678' })]);
    const e = (await liste()).json.eintraege;
    expect(e.find((x: any) => x.id === 'alt-12345678').name).toBe('Anna');
    expect(e.find((x: any) => x.id === 'neu-12345678').name).toBe('Berta');
  });
  it('der erste Name gilt auch für bisher anonyme Becher; schon benannte bleiben, ein späteres Löschen ändert nichts', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'anon-1-123456' }), becher({ id: 'anon-2-123456' })]);
    // Altbestand ohne Namen (vor der Namenspflicht eingereicht)
    await ruf('POST', '/api/admin/loeschen', { auth: ADMIN, body: { geraet: g.id, modus: 'name' } });
    const vorher = (await liste()).json;
    const r = await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Anna' } });
    expect(r.json.nachbenannt).toBe(2);
    // die geänderten Becher kommen mit neuer Sync-Nummer erneut, damit Geräte sie aktualisieren
    const neu = (await liste(`?nach=${vorher.naechste}`)).json.eintraege;
    expect(neu.map((e: any) => [e.id, e.name])).toEqual([['anon-1-123456', 'Anna'], ['anon-2-123456', 'Anna']]);
    // zweiter Name: alte Becher behalten 'Anna'
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Berta' } });
    expect((await liste()).json.eintraege.every((e: any) => e.name === 'Anna')).toBe(true);
    // Namen löschen: ändert vorhandene Becher nicht
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: '' } })).json.nachbenannt).toBe(0);
    expect((await liste()).json.eintraege.every((e: any) => e.name === 'Anna')).toBe(true);
  });
  it('Namen fremder Geräte bleiben unberührt', async () => {
    const a = await geraet();
    const b = await geraet();
    await sende(a, [becher({ id: 'von-a-1234567' })]);
    await sende(b, [becher({ id: 'von-b-1234567' })]);
    await ruf('POST', '/api/admin/loeschen', { auth: ADMIN, body: { geraet: a.id, modus: 'name' } });
    await ruf('PUT', '/api/ich', { auth: a.auth, body: { name: 'Anna' } });
    const e = (await liste()).json.eintraege;
    expect(e.find((x: any) => x.id === 'von-a-1234567').name).toBe('Anna');
    expect(e.find((x: any) => x.id === 'von-b-1234567').name).toBe('Tester');
  });
  it('ohne Namen keine Bewertung: der Becher bleibt in der App offen und geht mit dem Namen durch', async () => {
    const g = await geraet({ name: null });
    const b = becher({ id: 'anon-12345678' });
    const r = await sende(g, [b]);
    expect(r.status).toBe(200);
    expect(r.json.ergebnisse).toEqual([{ id: 'anon-12345678', status: 'name-fehlt', grund: 'Bitte zuerst einen Namen eingeben.' }]);
    expect((await liste()).json.eintraege).toHaveLength(0);
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Anna' } });
    expect((await sende(g, [b])).json.ergebnisse[0].status).toBe('ok');
    expect((await liste()).json.eintraege[0].name).toBe('Anna');
  });
  it('ein Name mit nur einem Zeichen ist zu kurz', async () => {
    const g = await geraet({ name: null });
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'A' } })).status).toBe(422);
  });
});

describe('Becher einreichen', () => {
  it('speichert und liefert Noten, Kennung und Zeit zurück; null bleibt null', async () => {
    const g = await geraet();
    const b = becher({ id: 'eins-12345678', sorte: 'kirsch', becherNr: 3, preis: 4.5, notiz: 'lecker' });
    const r = await sende(g, [b]);
    expect(r.json.ergebnisse).toEqual([{ id: 'eins-12345678', status: 'ok' }]);
    const e = (await liste()).json.eintraege[0];
    expect(e).toMatchObject({ id: 'eins-12345678', stand: expect.stringMatching(/^Glühweinkönig/), stadt: 'Nürnberg', sorte: 'kirsch', becherNr: 3, preis: 4.5, notiz: 'lecker', geraet: g.id, pruefstelle: false });
    expect(e.noten).toEqual({ geschmack: 8, geruch: 7, temperatur: null, personal: null, atmosphaere: null, preisLeistung: null, becher: null });
  });

  it('ist idempotent: dasselbe Gerät darf erneut senden (Netz brach nach dem Senden ab)', async () => {
    const g = await geraet();
    const b = becher({ id: 'zweimal-1234' });
    await sende(g, [b]);
    expect((await sende(g, [b])).json.ergebnisse[0].status).toBe('bereits');
    expect((await liste()).json.eintraege).toHaveLength(1);
  });

  it('ein anderes Gerät kann keine fremde ID überschreiben', async () => {
    const a = await geraet();
    const b = await geraet();
    await sende(a, [becher({ id: 'meins-1234567', stand: 'Original' })]);
    const r = await sende(b, [becher({ id: 'meins-1234567', stand: 'Fälschung' })]);
    expect(r.json.ergebnisse[0].status).toBe('abgelehnt');
    expect((await liste()).json.eintraege[0].stand).toBe('Original');
  });

  it('ein schlechter Eintrag blockiert die anderen nicht und nennt den Grund', async () => {
    const g = await geraet();
    const r = await sende(g, [becher({ id: 'gut-1234567' }), becher({ id: 'schlecht-123', stand: 'Besuch www.spam.de' }), becher({ id: 'gut2-123456' })]);
    expect(r.json.ergebnisse.map((x: any) => x.status)).toEqual(['ok', 'abgelehnt', 'ok']);
    expect(r.json.ergebnisse[1].grund).toMatch(/Link/);
    expect((await liste()).json.eintraege).toHaveLength(2);
  });

  it('Name, Kennung und Siegel aus der Anfrage werden ignoriert', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'faelsch-1234', name: 'Admin', pruefstelle: true, geraet: 'fremd' })]);
    const e = (await liste()).json.eintraege[0];
    expect(e.pruefstelle).toBe(false);
    expect(e.geraet).toBe(g.id);
    expect(e.name).toBe('Tester'); // der Name kommt vom Gerät, nicht aus der Anfrage
  });

  it('ohne Anmeldung: 401', async () => {
    expect((await ruf('POST', '/api/becher', { body: { eintraege: [becher()] } })).status).toBe(401);
  });
  it.each([[[]], [Array.from({ length: 21 }, () => ({}))], ['nix']])('ungültige Menge: 400', async (eintraege) => {
    const g = await geraet();
    expect((await ruf('POST', '/api/becher', { auth: g.auth, body: { eintraege } })).status).toBe(400);
  });

  it('Tageslimit: 100 Becher je Gerät, danach "zu-viele"; nach 24 Stunden geht es wieder', async () => {
    const g = await geraet();
    for (let i = 0; i < 5; i++) {
      const r = await sende(g, Array.from({ length: 20 }, () => becher()));
      expect(r.json.ergebnisse.every((x: any) => x.status === 'ok')).toBe(true);
    }
    const voll = await sende(g, [becher({ id: 'ueber-1234567' })]);
    expect(voll.json.ergebnisse[0].status).toBe('zu-viele');
    const am_naechsten_tag = await sende(g, [becher({ id: 'ueber-1234567' })], { jetzt: JETZT + 25 * 3_600_000 });
    expect(am_naechsten_tag.json.ergebnisse[0].status).toBe('ok');
  });

  it('Schreib-Limit je Adresse und Minute: 429, in der nächsten Minute wieder frei', async () => {
    for (let i = 0; i < 240; i++) expect((await ruf('POST', '/api/melden', { ip: '7.7.7.7', body: {} })).status).toBe(401);
    expect((await ruf('POST', '/api/melden', { ip: '7.7.7.7', body: {} })).status).toBe(429);
    expect((await ruf('POST', '/api/melden', { ip: '6.6.6.6', body: {} })).status).toBe(401);
    expect((await ruf('POST', '/api/melden', { ip: '7.7.7.7', jetzt: JETZT + 61_000, body: {} })).status).toBe(401);
  });

  it('Lesen zählt nicht und schreibt nichts in die Datenbank (schont das Schreib-Kontingent)', async () => {
    for (let i = 0; i < 200; i++) expect((await ruf('GET', '/api/status', { ip: '7.7.7.7' })).status).toBe(200);
    for (let i = 0; i < 20; i++) await liste('', { ip: '7.7.7.7' });
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM limits').first<{ n: number }>();
    expect(n?.n).toBe(0);
  });

  it('Adressen werden nie im Klartext gespeichert', async () => {
    await geraet({ ip: '203.0.113.77' });
    await ruf('POST', '/api/melden', { ip: '203.0.113.77', body: {} });
    const { results } = await env.DB.prepare('SELECT schluessel FROM limits').all<{ schluessel: string }>();
    expect(results.length).toBeGreaterThan(0);
    for (const z of results) {
      expect(z.schluessel).not.toContain('203.0.113.77');
      expect(z.schluessel).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    }
  });

  nurTs('derselbe Zähler hängt nicht über Tage zusammen (Tagessalz)', async () => {
    const { adressSchluessel } = await import('../src/app');
    const heute = await adressSchluessel(env, 'schreiben', '1.2.3.4', JETZT);
    const morgen = await adressSchluessel(env, 'schreiben', '1.2.3.4', JETZT + 25 * 3_600_000);
    expect(heute).not.toBe(morgen);
    expect(await adressSchluessel(env, 'schreiben', '1.2.3.4', JETZT)).toBe(heute);
    env.IP_SALT = 'anderes-salz';
    expect(await adressSchluessel(env, 'schreiben', '1.2.3.4', JETZT)).not.toBe(heute);
  });

  nurTs('Aufräumen löscht abgelaufene Zähler und lässt frische stehen', async () => {
    const { raeumeAuf } = await import('../src/app');
    await ruf('POST', '/api/melden', { ip: '1.1.1.1', body: {}, jetzt: JETZT - 3 * 86_400_000 });
    await ruf('POST', '/api/melden', { ip: '2.2.2.2', body: {} });
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM limits').first<{ n: number }>())?.n).toBe(2);
    expect(await raeumeAuf(env.DB, JETZT)).toBe(1);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM limits').first<{ n: number }>())?.n).toBe(1);
  });
});

describe('Prüfstelle', () => {
  it('falscher Code: 403', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: 'falsch' } })).status).toBe(403);
    expect((await ruf('GET', '/api/ich', { auth: g.auth })).json.pruefstelle).toBe(false);
  });
  it('ohne konfigurierten Code ist niemand Prüfstelle', async () => {
    env.PRUEFSTELLE_CODE = undefined;
    const g = await geraet();
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: 'undefined' } })).status).toBe(503);
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: '' } })).status).toBe(503);
  });
  it('richtiger Code: Siegel für neue Becher, Name David erlaubt', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'vorher-12345' })]);
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: CODE } })).json.pruefstelle).toBe(true);
    expect((await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'David' } })).status).toBe(200);
    await sende(g, [becher({ id: 'nachher-1234' })]);
    const e = (await liste()).json.eintraege;
    expect(e.find((x: any) => x.id === 'vorher-12345').pruefstelle).toBe(false);
    expect(e.find((x: any) => x.id === 'nachher-1234')).toMatchObject({ pruefstelle: true, name: 'David' });
  });
  it('Code raten ist begrenzt', async () => {
    const g = await geraet();
    for (let i = 0; i < 10; i++) expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: `x${i}` } })).status).toBe(403);
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: CODE } })).status).toBe(429);
  });
});

describe('Becher abrufen', () => {
  it('öffentlich lesbar ohne Anmeldung, von jeder Seite', async () => {
    const r = await liste('', { origin: 'https://irgendwer.example' });
    expect(r.status).toBe(200);
    expect(r.kopf.get('Access-Control-Allow-Origin')).toBe('*');
    expect(r.json).toEqual({ eintraege: [], naechste: 0, mehr: false });
  });
  it('liefert in Seiten, aufsteigend nach Sync-Nummer', async () => {
    const g = await geraet();
    await sende(g, Array.from({ length: 5 }, (_, i) => becher({ id: `seite-${i}-1234567` })));
    const a = (await liste('?limit=2')).json;
    expect(a.eintraege.map((e: any) => e.id)).toEqual(['seite-0-1234567', 'seite-1-1234567']);
    expect(a.mehr).toBe(true);
    const b = (await liste(`?limit=2&nach=${a.naechste}`)).json;
    expect(b.eintraege.map((e: any) => e.id)).toEqual(['seite-2-1234567', 'seite-3-1234567']);
    const c = (await liste(`?limit=2&nach=${b.naechste}`)).json;
    expect(c.eintraege.map((e: any) => e.id)).toEqual(['seite-4-1234567']);
    expect(c.mehr).toBe(false);
    const leer = (await liste(`?nach=${c.naechste}`)).json;
    expect(leer).toEqual({ eintraege: [], naechste: c.naechste, mehr: false });
  });
  it('Unsinn bei nach/limit wird abgefangen', async () => {
    expect((await liste('?nach=abc&limit=-5')).status).toBe(200);
    expect((await liste('?limit=99999')).status).toBe(200);
  });
});

describe('Moderation', () => {
  const admin = { auth: ADMIN };
  it.each([
    ['verstecken', { id: 'x', versteckt: true }],
    ['sperren', { geraet: 'x', gesperrt: true }],
    ['import', { eintraege: [becher()] }],
  ])('%s ohne Admin-Token: 401', async (was, body) => {
    expect((await ruf('POST', `/api/admin/${was}`, { body })).status).toBe(401);
    expect((await ruf('POST', `/api/admin/${was}`, { auth: 'falsch', body })).status).toBe(401);
  });
  it('ohne konfiguriertes Admin-Geheimnis ist der Zugang zu, auch mit leerem oder "undefined"-Token', async () => {
    env.ADMIN_TOKEN = undefined;
    for (const t of ['', 'undefined']) expect((await ruf('POST', '/api/admin/verstecken', { auth: t || 'x', body: { id: 'x', versteckt: true } })).status).toBe(401);
  });

  it('Verstecken: Platzhalter mit neuer Sync-Nummer, Einblenden bringt den Becher zurück', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'weg-12345678' })]);
    const vorher = (await liste()).json;
    expect((await ruf('POST', '/api/admin/verstecken', { ...admin, body: { id: 'weg-12345678', versteckt: true } })).status).toBe(200);
    const nachher = (await liste(`?nach=${vorher.naechste}`)).json;
    expect(nachher.eintraege).toHaveLength(1);
    expect(nachher.eintraege[0]).toMatchObject({ id: 'weg-12345678', versteckt: true });
    expect(nachher.eintraege[0]).not.toHaveProperty('stand');
    expect(nachher.eintraege[0].seq).toBeGreaterThan(vorher.naechste);
    await ruf('POST', '/api/admin/verstecken', { ...admin, body: { id: 'weg-12345678', versteckt: false } });
    const zurueck = (await liste(`?nach=${nachher.naechste}`)).json.eintraege[0];
    expect(zurueck.stand).toMatch(/^Glühweinkönig/);
  });
  it('Verstecken: unbekannter Becher 404', async () => {
    expect((await ruf('POST', '/api/admin/verstecken', { ...admin, body: { id: 'gibts-nicht', versteckt: true } })).status).toBe(404);
  });

  it('Sperren blendet alle Becher des Geräts aus und blockiert es; Entsperren bringt sie zurück', async () => {
    const spam = await geraet();
    const gut = await geraet();
    await sende(spam, [becher({ id: 'spam-1-123456' }), becher({ id: 'spam-2-123456' })]);
    await sende(gut, [becher({ id: 'gut-1-1234567' })]);
    const r = await ruf('POST', '/api/admin/sperren', { ...admin, body: { geraet: spam.id, gesperrt: true } });
    expect(r.json.betroffen).toBe(2);
    expect((await sende(spam, [becher()])).status).toBe(403);
    expect((await ruf('GET', '/api/ich', { auth: spam.auth })).status).toBe(403);
    const alle = (await liste()).json.eintraege;
    expect(alle.filter((e: any) => e.versteckt).map((e: any) => e.id).sort()).toEqual(['spam-1-123456', 'spam-2-123456']);
    expect(alle.find((e: any) => e.id === 'gut-1-1234567').stand).toMatch(/^Glühweinkönig/);
    await ruf('POST', '/api/admin/sperren', { ...admin, body: { geraet: spam.id, gesperrt: false } });
    expect((await ruf('GET', '/api/ich', { auth: spam.auth })).status).toBe(200);
    const danach = (await liste()).json.eintraege;
    expect(danach.filter((e: any) => e.versteckt)).toHaveLength(0);
    expect(danach.every((e: any) => /^Glühweinkönig/.test(e.stand))).toBe(true);
  });

  it('Import der Bestandsdaten: Siegel, eigener Name, alte Zeitstempel, idempotent', async () => {
    const alt = Date.parse('2025-12-01T00:00:00Z');
    const daten = [
      { id: 'import-2025-001-salz-chrom', stand: 'Salz Chrom', markt: 'Sonstiger', saison: 2025, noten: { ...leereNoten(), geschmack: 6 }, erstelltAm: alt },
      { id: 'import-2025-002-nix', stand: 'Kaputt', markt: 'Sonstiger', saison: 2025, noten: leereNoten(), erstelltAm: alt },
    ];
    const r = await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: daten } });
    expect(r.json.neu).toBe(1);
    expect(r.json.abgelehnt).toHaveLength(1);
    const e = (await liste()).json.eintraege[0];
    expect(e).toMatchObject({ id: 'import-2025-001-salz-chrom', pruefstelle: true, name: 'Prüfstelle', geraet: 'bestand-pruefstelle', erstelltAm: alt });
    expect((await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: daten } })).json.neu).toBe(0);
    expect((await liste()).json.eintraege).toHaveLength(1);
  });
  it('Import korrigiert Bestandsdaten: gleiche ID, neuer Stand und Stadt; neue Sync-Nummer; zweiter Lauf ändert nichts', async () => {
    const alt = Date.parse('2025-12-01T00:00:00Z');
    const vorher = { id: 'import-2025-001-salz-chrom', stand: 'Salz Chrom', markt: 'Sonstiger', saison: 2025, noten: { ...leereNoten(), geschmack: 6 }, erstelltAm: alt };
    const nachher = { ...vorher, stand: 'Chrom', stadt: 'Salzburg' };
    await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: [vorher, { ...vorher, id: 'import-2025-002-weiter', stand: 'Weiter' }] } });
    const seq0 = (await liste()).json.naechste as number;
    const r = await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: [nachher, { ...vorher, id: 'import-2025-002-weiter', stand: 'Weiter' }] } });
    expect(r.json).toMatchObject({ neu: 0, aktualisiert: 1 });
    const e = (await liste()).json.eintraege.find((x: any) => x.id === vorher.id);
    expect(e).toMatchObject({ stand: 'Chrom', stadt: 'Salzburg', pruefstelle: true });
    expect(e.seq).toBeGreaterThan(seq0);
    // Geräte holen die Korrektur über die Sync-Nummer
    expect((await liste(`?nach=${seq0}`)).json.eintraege.map((x: any) => x.id)).toEqual([vorher.id]);
    expect((await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: [nachher] } })).json).toMatchObject({ neu: 0, aktualisiert: 0 });
    expect((await liste()).json.eintraege).toHaveLength(2);
  });
  it('Import fasst Becher von Nutzern nie an, auch bei gleicher ID', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'fremd-12345678', stand: 'Original' })]);
    const r = await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: [becher({ id: 'fremd-12345678', stand: 'Überschrieben' })] } });
    expect(r.json).toMatchObject({ neu: 0, aktualisiert: 0 });
    expect((await liste()).json.eintraege[0].stand).toBe('Original');
  });
  it('das Bestandsgerät kann sich nie anmelden', async () => {
    await ruf('POST', '/api/admin/import', { ...admin, body: { eintraege: [becher({ id: 'imp-12345678' })] } });
    for (const s of ['-', '', 'a'.repeat(64)]) {
      expect((await ruf('GET', '/api/ich', { auth: `bestand-pruefstelle.${s.padEnd(64, '0')}` })).status).toBe(401);
    }
  });
});

describe('Browser-Ursprünge', () => {
  it('Vorabfrage von der eigenen Seite: erlaubt, mit Anmeldung im Header', async () => {
    const r = await ruf('OPTIONS', '/api/becher', { origin: SITE });
    expect(r.status).toBe(204);
    expect(r.kopf.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(r.kopf.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });
  it('Vorabfrage von einer fremden Seite: 403', async () => {
    expect((await ruf('OPTIONS', '/api/becher', { origin: 'https://boese.example' })).status).toBe(403);
  });
  it('Schreiben von einer fremden Seite: 403, auch mit gültiger Anmeldung', async () => {
    const g = await geraet();
    const r = await sende(g, [becher()], { origin: 'https://boese.example' });
    expect(r.status).toBe(403);
    expect((await liste()).json.eintraege).toHaveLength(0);
  });
  it('Schreiben ohne Origin (Skripte, Admin-Werkzeuge) geht', async () => {
    const g = await geraet({ origin: null });
    expect((await sende(g, [becher()], { origin: null })).status).toBe(200);
  });
  it('Antworten für die eigene Seite tragen deren Ursprung', async () => {
    const g = await geraet();
    const r = await ruf('GET', '/api/ich', { auth: g.auth, origin: SITE });
    expect(r.kopf.get('Access-Control-Allow-Origin')).toBe(SITE);
  });
});

describe('Melden', () => {
  const melde = (g: { auth: string }, id: string, grund = 'spam', extra: Record<string, unknown> = {}) =>
    ruf('POST', '/api/melden', { auth: g.auth, body: { id, grund, ...extra } });
  const offen = async () => (await ruf('GET', '/api/admin/meldungen', { auth: ADMIN })).json.meldungen as any[];

  it('ohne Anmeldung: 401', async () => {
    expect((await ruf('POST', '/api/melden', { body: { id: 'x', grund: 'spam' } })).status).toBe(401);
  });

  it('meldet einen Becher; Meldungen mehrerer Geräte werden gezählt, doppelte desselben Geräts nicht', async () => {
    const autor = await geraet();
    const a = await geraet();
    const b = await geraet();
    await sende(autor, [becher({ id: 'boese-1234567', stand: 'Fragwürdig' })]);
    expect((await melde(a, 'boese-1234567', 'spam')).status).toBe(200);
    expect((await melde(a, 'boese-1234567', 'spam')).status).toBe(200); // idempotent
    expect((await melde(b, 'boese-1234567', 'unpassend', { text: 'beleidigend' })).status).toBe(200);
    const m = await offen();
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ id: 'boese-1234567', anzahl: 2, stand: 'Fragwürdig', geraet_id: autor.id });
    expect(m[0].gruende.split(',').sort()).toEqual(['spam', 'unpassend']);
  });

  it.each([
    ['unbekannter Grund', { grund: 'langweilig' }],
    ['kein Grund', { grund: undefined }],
    ['Text kein Text', { text: 42 }],
  ])('lehnt ab: %s', async (_n, patch) => {
    const g = await geraet();
    await sende(g, [becher({ id: 'ziel-12345678' })]);
    expect((await melde(g, 'ziel-12345678', 'spam', patch)).status).toBe(400);
  });

  it('unbekannte oder schon ausgeblendete Becher: 404', async () => {
    const g = await geraet();
    expect((await melde(g, 'gibts-nicht-12')).status).toBe(404);
    await sende(g, [becher({ id: 'weg-12345678x' })]);
    await ruf('POST', '/api/admin/verstecken', { auth: ADMIN, body: { id: 'weg-12345678x', versteckt: true } });
    expect((await melde(g, 'weg-12345678x')).status).toBe(404);
  });

  it('Text wird gesäubert und auf 300 Zeichen gekürzt', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'text-1234567x' })]);
    await melde(g, 'text-1234567x', 'sonstiges', { text: ' a\u0000b ' + 'x'.repeat(400) });
    const z = await env.DB.prepare('SELECT text FROM meldungen').first<{ text: string }>();
    expect(z?.text?.startsWith('ab ')).toBe(true);
    expect([...(z?.text ?? '')].length).toBe(300);
  });

  it('Tageslimit: höchstens 20 Meldungen je Gerät', async () => {
    const g = await geraet();
    const autor = await geraet();
    await sende(autor, Array.from({ length: 20 }, (_, i) => becher({ id: `viele-${i}-123456` })));
    await sende(autor, [becher({ id: 'viele-20-123456' })]);
    for (let i = 0; i < 20; i++) expect((await melde(g, `viele-${i}-123456`)).status).toBe(200);
    expect((await melde(g, 'viele-20-123456')).status).toBe(429);
  });

  it('Moderationsliste nur mit Admin-Token', async () => {
    expect((await ruf('GET', '/api/admin/meldungen')).status).toBe(401);
    expect((await ruf('GET', '/api/admin/meldungen', { auth: 'falsch' })).status).toBe(401);
  });

  it('Ausblenden erledigt die Meldungen; Verwerfen auch, ohne den Becher auszublenden', async () => {
    const autor = await geraet();
    const a = await geraet();
    await sende(autor, [becher({ id: 'eins-1234567x' }), becher({ id: 'zwei-1234567x' })]);
    await melde(a, 'eins-1234567x');
    await melde(a, 'zwei-1234567x');
    expect(await offen()).toHaveLength(2);
    await ruf('POST', '/api/admin/verstecken', { auth: ADMIN, body: { id: 'eins-1234567x', versteckt: true } });
    expect((await offen()).map((m) => m.id)).toEqual(['zwei-1234567x']);
    await ruf('POST', '/api/admin/meldung-verwerfen', { auth: ADMIN, body: { id: 'zwei-1234567x' } });
    expect(await offen()).toHaveLength(0);
    const e = (await liste()).json.eintraege;
    expect(e.find((x: any) => x.id === 'zwei-1234567x').stand).toMatch(/^Glühweinkönig/); // noch sichtbar
  });
});

describe('Löschen auf Anfrage', () => {
  const loesche = (geraet: string, modus: string) => ruf('POST', '/api/admin/loeschen', { auth: ADMIN, body: { geraet, modus } });

  it('ohne Admin-Token: 401', async () => {
    expect((await ruf('POST', '/api/admin/loeschen', { body: { geraet: 'x', modus: 'alles' } })).status).toBe(401);
  });
  it.each([[{ modus: 'alles' }], [{ geraet: 'x' }], [{ geraet: 'x', modus: 'kaputt' }]])('lehnt unvollständige Anfrage ab', async (body) => {
    expect((await ruf('POST', '/api/admin/loeschen', { auth: ADMIN, body })).status).toBe(400);
  });
  it('unbekanntes Gerät: 404', async () => expect((await loesche('gibts-nicht-1234567', 'name')).status).toBe(404));

  it("'name' entfernt den Namen von allen Bechern, die Bewertungen bleiben", async () => {
    const g = await geraet();
    const anderes = await geraet();
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Anna' } });
    await ruf('PUT', '/api/ich', { auth: anderes.auth, body: { name: 'Berta' } });
    await sende(g, [becher({ id: 'a-1-12345678' }), becher({ id: 'a-2-12345678' })]);
    await sende(anderes, [becher({ id: 'b-1-12345678' })]);
    const vorher = (await liste()).json.naechste;
    expect((await loesche(g.id, 'name')).json.betroffen).toBe(2);
    const neu = (await liste(`?nach=${vorher}`)).json.eintraege;
    expect(neu).toHaveLength(2); // geändert, also erneut ausgeliefert
    for (const e of neu) {
      expect(e).not.toHaveProperty('name');
      expect(e.stand).toMatch(/^Glühweinkönig/);
    }
    expect((await liste()).json.eintraege.find((e: any) => e.id === 'b-1-12345678').name).toBe('Berta');
    expect((await ruf('GET', '/api/ich', { auth: g.auth })).json.name).toBeNull();
  });

  it("'alles' macht die Becher unkenntlich, sperrt das Gerät und räumt Meldungen weg", async () => {
    const g = await geraet();
    const melder = await geraet();
    await ruf('PUT', '/api/ich', { auth: g.auth, body: { name: 'Anna' } });
    await sende(g, [becher({ id: 'weg-1-1234567', notiz: 'privat', preis: 4.5 })]);
    await ruf('POST', '/api/melden', { auth: melder.auth, body: { id: 'weg-1-1234567', grund: 'spam' } });
    expect((await loesche(g.id, 'alles')).json.betroffen).toBe(1);
    const e = (await liste()).json.eintraege.find((x: any) => x.id === 'weg-1-1234567');
    expect(e).toMatchObject({ id: 'weg-1-1234567', versteckt: true });
    const roh = await env.DB.prepare('SELECT * FROM becher WHERE id = ?').bind('weg-1-1234567').first<Record<string, unknown>>();
    expect(roh).toMatchObject({ name: null, notiz: null, stadt: null, stand: '-', markt: '-', geschmack: null, preis: null, versteckt: 1 });
    expect((await ruf('GET', '/api/ich', { auth: g.auth })).status).toBe(401);
    expect(((await ruf('GET', '/api/admin/meldungen', { auth: ADMIN })).json.meldungen as unknown[]).length).toBe(0);
  });
});

describe('Eine Bewertung je Gerät, Stand und Abend', () => {
  const am = (stand: string, patch: Record<string, unknown> = {}) => becher({ stand, markt: 'Rathausmarkt', stadt: 'Hamburg', ...patch });

  it('derselbe Stand am selben Abend wird abgelehnt, auch bei anderer Schreibweise', async () => {
    const g = await geraet();
    expect((await sende(g, [am('Chrom')])).json.ergebnisse[0].status).toBe('ok');
    const r = await sende(g, [am(' CHROM! ')]);
    expect(r.json.ergebnisse[0].status).toBe('abgelehnt');
    expect(r.json.ergebnisse[0].grund).toMatch(/schon bewertet/);
    expect((await liste()).json.eintraege).toHaveLength(1);
  });
  it('auch innerhalb einer Anfrage', async () => {
    const g = await geraet();
    const r = await sende(g, [am('Chrom'), am('chrom')]);
    expect(r.json.ergebnisse.map((x: any) => x.status)).toEqual(['ok', 'abgelehnt']);
  });
  it('ein anderer Abend, ein anderer Stand, eine andere Stadt und ein anderes Gerät sind erlaubt', async () => {
    const g = await geraet();
    const h = await geraet();
    const r = await sende(g, [
      am('Chrom'),
      am('Chrom', { datum: '2026-12-06' }),
      am('Gustl'),
      am('Chrom', { stadt: 'Köln' }),
    ]);
    expect(r.json.ergebnisse.map((x: any) => x.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect((await sende(h, [am('Chrom')])).json.ergebnisse[0].status).toBe('ok');
  });
  it('derselbe Stand an einem anderen Markt derselben Stadt ist derselbe Stand', async () => {
    const g = await geraet();
    expect((await sende(g, [am('Chrom')])).json.ergebnisse[0].status).toBe('ok');
    expect((await sende(g, [am('Chrom', { markt: 'Winterwald' })])).json.ergebnisse[0].status).toBe('abgelehnt');
  });
  it('ausgeblendete Bewertungen zählen nicht mehr', async () => {
    const g = await geraet();
    await sende(g, [am('Chrom', { id: 'erste-1234567' })]);
    await ruf('POST', '/api/admin/verstecken', { auth: ADMIN, body: { id: 'erste-1234567', versteckt: true } });
    expect((await sende(g, [am('Chrom')])).json.ergebnisse[0].status).toBe('ok');
  });
});

describe('Preis und Größe', () => {
  it('ohne Preis keine neue Bewertung; die Meldung sagt warum', async () => {
    const g = await geraet();
    const { preis, ...ohnePreis } = becher({ id: 'ohne-preis-123' });
    void preis;
    const r = await sende(g, [ohnePreis]);
    expect(r.json.ergebnisse[0]).toMatchObject({ status: 'abgelehnt', grund: 'Der Preis fehlt.' });
    expect((await liste()).json.eintraege).toHaveLength(0);
  });
  it('speichert die Größe und liefert sie zurück; ohne Angabe fehlt das Feld', async () => {
    const g = await geraet();
    await sende(g, [becher({ id: 'mit-menge-1234', menge: 0.25 }), becher({ id: 'ohne-menge-123' })]);
    const e = (await liste()).json.eintraege;
    expect(e.find((x: any) => x.id === 'mit-menge-1234').menge).toBe(0.25);
    expect(e.find((x: any) => x.id === 'ohne-menge-123')).not.toHaveProperty('menge');
  });
  it.each([0, 0.05, 2, 'x', -1])('lehnt Größe %s ab', async (menge) => {
    const g = await geraet();
    const r = await sende(g, [becher({ menge })]);
    expect(r.json.ergebnisse[0]).toMatchObject({ status: 'abgelehnt', grund: 'Ungültige Menge.' });
  });
});

describe('Bewertungen entfernen', () => {
  it('entfernt Inhalt und Namen endgültig, lässt einen Platzhalter für andere Geräte und beendet Meldungen', async () => {
    const pruef = await geraet();
    await ruf('POST', '/api/pruefstelle', { auth: pruef.auth, body: { code: CODE } });
    const g = await geraet();
    await sende(g, [becher({ id: 'weg-a-1234567', notiz: 'privat' }), becher({ id: 'bleibt-1234567' })]);
    await ruf('POST', '/api/melden', { auth: g.auth, body: { id: 'weg-a-1234567', grund: 'spam' } });
    const vorher = (await liste()).json;
    const r = await ruf('POST', '/api/admin/entfernen', { auth: pruef.auth, body: { ids: ['weg-a-1234567', 'gibt-es-nicht'] } });
    expect(r.status).toBe(200);
    expect(r.json.betroffen).toBe(1);
    const neu = (await liste(`?nach=${vorher.naechste}`)).json.eintraege;
    expect(neu).toEqual([{ id: 'weg-a-1234567', versteckt: true, seq: expect.any(Number) }]);
    const roh = await ruf('GET', '/api/admin/meldungen', { auth: ADMIN });
    expect(roh.json.meldungen).toEqual([]);
    expect((await liste()).json.eintraege.find((e: any) => e.id === 'bleibt-1234567').stand).toMatch(/^Glühweinkönig/);
  });
  it('nur für die Prüfstelle, und mit gültiger Liste', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/admin/entfernen', { auth: g.auth, body: { ids: ['x'] } })).status).toBe(401);
    expect((await ruf('POST', '/api/admin/entfernen', { auth: ADMIN, body: { ids: [] } })).status).toBe(400);
    expect((await ruf('POST', '/api/admin/entfernen', { auth: ADMIN, body: { ids: Array.from({ length: 201 }, (_, i) => `i-${i}`) } })).status).toBe(400);
  });
});

describe('Prüfstellen-Code', () => {
  it('Leerzeichen und Zeilenumbruch am Rand zählen nicht, auf beiden Seiten', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: `  ${CODE}\n` } })).status).toBe(200);
    env = neuerEnv({ ADMIN_TOKEN: ADMIN, PRUEFSTELLE_CODE: `${CODE}\n`, ERLAUBTE_URSPRUENGE: SITE });
    const h = await geraet();
    expect((await ruf('POST', '/api/pruefstelle', { auth: h.auth, body: { code: CODE } })).status).toBe(200);
  });
  it('falscher Code: 403; ohne eingerichteten Code: 503 mit klarer Meldung', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/pruefstelle', { auth: g.auth, body: { code: 'falsch' } })).status).toBe(403);
    env = neuerEnv({ ADMIN_TOKEN: ADMIN, ERLAUBTE_URSPRUENGE: SITE });
    const h = await geraet();
    const r = await ruf('POST', '/api/pruefstelle', { auth: h.auth, body: { code: CODE } });
    expect(r.status).toBe(503);
    expect(r.json.fehler).toMatch(/PRUEFSTELLE_CODE/);
  });
});

describe('Moderation mit dem Prüfstellen-Gerät', () => {
  it('ein Prüfstellen-Gerät darf moderieren, ein normales nicht', async () => {
    const pruef = await geraet();
    const normal = await geraet();
    await ruf('POST', '/api/pruefstelle', { auth: pruef.auth, body: { code: CODE } });
    await sende(normal, [becher({ id: 'ziel-12345678' })]);
    expect((await ruf('GET', '/api/admin/meldungen', { auth: normal.auth })).status).toBe(401);
    expect((await ruf('POST', '/api/admin/verstecken', { auth: normal.auth, body: { id: 'ziel-12345678', versteckt: true } })).status).toBe(401);
    expect((await ruf('GET', '/api/admin/meldungen', { auth: pruef.auth })).status).toBe(200);
    expect((await ruf('POST', '/api/admin/verstecken', { auth: pruef.auth, body: { id: 'ziel-12345678', versteckt: true } })).status).toBe(200);
    expect((await liste()).json.eintraege[0].versteckt).toBe(true);
  });
  it('ein gesperrtes Prüfstellen-Gerät verliert den Zugang', async () => {
    const pruef = await geraet();
    await ruf('POST', '/api/pruefstelle', { auth: pruef.auth, body: { code: CODE } });
    await ruf('POST', '/api/admin/sperren', { auth: ADMIN, body: { geraet: pruef.id, gesperrt: true } });
    expect((await ruf('GET', '/api/admin/meldungen', { auth: pruef.auth })).status).toBe(401);
  });

  it('Stand ändern: benennt alle genannten Bewertungen um und bringt sie mit neuer Sync-Nummer', async () => {
    const pruef = await geraet();
    await ruf('POST', '/api/pruefstelle', { auth: pruef.auth, body: { code: CODE } });
    const a = await geraet();
    const b = await geraet();
    await sende(a, [becher({ id: 'alt-a-1234567', stand: 'Gluehweinkoenig' })]);
    await sende(b, [becher({ id: 'alt-b-1234567', stand: 'Glühweinkönig' })]);
    const vorher = (await liste()).json;
    const r = await ruf('POST', '/api/admin/stand-aendern', {
      auth: pruef.auth,
      body: { ids: ['alt-a-1234567', 'gibt-es-nicht'], stand: ' Glühweinkönig ', markt: 'Rathausmarkt', stadt: 'Hamburg' },
    });
    expect(r.status).toBe(200);
    expect(r.json.betroffen).toBe(1);
    const neu = (await liste(`?nach=${vorher.naechste}`)).json.eintraege;
    expect(neu).toHaveLength(1);
    expect(neu[0]).toMatchObject({ id: 'alt-a-1234567', stand: 'Glühweinkönig', markt: 'Rathausmarkt', stadt: 'Hamburg' });
  });
  it.each([
    ['ohne Liste', { stand: 'X', markt: 'Y' }],
    ['leere Liste', { ids: [], stand: 'X', markt: 'Y' }],
    ['Stand fehlt', { ids: ['a'], markt: 'Y' }],
    ['Link im Stand', { ids: ['a'], stand: 'www.x.de', markt: 'Y' }],
    ['zu viele', { ids: Array.from({ length: 201 }, (_, i) => `id-${i}`), stand: 'X', markt: 'Y' }],
  ])('Stand ändern lehnt ab: %s', async (_n, body) => {
    const r = await ruf('POST', '/api/admin/stand-aendern', { auth: ADMIN, body });
    expect([400, 422]).toContain(r.status);
  });
  it('Stand ändern ist nur für die Prüfstelle', async () => {
    const g = await geraet();
    expect((await ruf('POST', '/api/admin/stand-aendern', { auth: g.auth, body: { ids: ['a'], stand: 'X', markt: 'Y' } })).status).toBe(401);
  });

  it('Zugang entziehen: alle Prüfstellen-Geräte außer dem genannten verlieren die Rechte, das Siegel alter Becher bleibt', async () => {
    const p1 = await geraet();
    const p2 = await geraet();
    for (const p of [p1, p2]) await ruf('POST', '/api/pruefstelle', { auth: p.auth, body: { code: CODE } });
    await sende(p2, [becher({ id: 'siegel-1234567' })]);
    const r = await ruf('POST', '/api/admin/pruefstelle-zuruecksetzen', { auth: p1.auth, body: { behalten: p1.id } });
    expect(r.json.betroffen).toBe(1);
    expect((await ruf('GET', '/api/ich', { auth: p1.auth })).json.pruefstelle).toBe(true);
    expect((await ruf('GET', '/api/ich', { auth: p2.auth })).json.pruefstelle).toBe(false);
    expect((await ruf('GET', '/api/admin/meldungen', { auth: p2.auth })).status).toBe(401);
    expect((await liste()).json.eintraege.find((e: any) => e.id === 'siegel-1234567').pruefstelle).toBe(true);
  });
});
