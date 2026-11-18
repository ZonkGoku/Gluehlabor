import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ermittleAdresse } from './adresse';
import { baueServer, sichere } from './server';
import { oeffneDatenbank, type Datenbank } from './sqlite-d1';
import { ladeDatei } from './static';

const MIGR = resolve(process.cwd(), 'worker/migrations');
let ordner: string, dist: string, db: Datenbank, server: Server, basis: string;
const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

beforeEach(async () => {
  ordner = mkdtempSync(resolve(tmpdir(), 'gl-'));
  dist = resolve(ordner, 'dist');
  mkdirSync(resolve(dist, 'assets'), { recursive: true });
  writeFileSync(resolve(dist, 'index.html'), '<!doctype html><title>x</title>');
  writeFileSync(resolve(dist, 'sw.js'), 'x');
  writeFileSync(resolve(dist, 'assets/a-123.js'), 'x');
  writeFileSync(resolve(ordner, 'geheim.txt'), 'geheim');
  db = oeffneDatenbank(resolve(ordner, 'daten', 'g.sqlite'), MIGR);
  server = baueServer({ db, dist, env: { ADMIN_TOKEN: 'a'.repeat(30), IP_SALT: 's'.repeat(20), ERLAUBTE_URSPRUENGE: 'https://gluehlabor.de' } });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  basis = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise((r) => server.close(r));
  db.schliessen();
});

describe('Adresse', () => {
  it('öffentliche Verbindung: Header wird ignoriert', () => expect(ermittleAdresse('::ffff:8.8.8.8', '1.1.1.1')).toBe('8.8.8.8'));
  it('private Verbindung: X-Real-IP zählt', () => {
    expect(ermittleAdresse('172.18.0.1', '203.0.113.5')).toBe('203.0.113.5');
    expect(ermittleAdresse('127.0.0.1', '2001:db8::1')).toBe('2001:db8::1');
  });
  it('ohne Header hinter Proxy: unbekannt', () => expect(ermittleAdresse('172.18.0.1', undefined)).toBeNull());
  it('Müll im Header wird verworfen', () => expect(ermittleAdresse('127.0.0.1', '<script>')).toBeNull());
});

describe('statische Dateien', () => {
  it('liefert index mit CSP und Sicherheitsköpfen', async () => {
    const r = await fetch(basis + '/');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('cache-control')).toBe('no-cache');
  });
  it('Assets unveränderlich, Service Worker nie zwischenspeichern', async () => {
    expect((await fetch(basis + '/assets/a-123.js')).headers.get('cache-control')).toContain('immutable');
    expect((await fetch(basis + '/sw.js')).headers.get('cache-control')).toBe('no-cache');
  });
  it('ETag führt zu 304', async () => {
    const etag = (await fetch(basis + '/')).headers.get('etag')!;
    expect((await fetch(basis + '/', { headers: { 'If-None-Match': etag } })).status).toBe(304);
  });
  it('Pfade außerhalb von dist sind nicht erreichbar', async () => {
    for (const p of ['/../geheim.txt', '/%2e%2e/geheim.txt', '/..%2fgeheim.txt', '/a%5c..%5cgeheim.txt', '/%00']) {
      expect((await ladeDatei(dist, p)).status).not.toBe(200);
    }
    expect((await fetch(basis + '/nicht-da')).status).toBe(404);
  });
  it('HSTS nur hinter HTTPS-Proxy', async () => {
    expect((await fetch(basis + '/')).headers.get('strict-transport-security')).toBeNull();
    expect((await fetch(basis + '/', { headers: { 'X-Forwarded-Proto': 'https' } })).headers.get('strict-transport-security')).toContain('max-age');
  });
  it('sagt Suchmaschinen: nicht listen (Seite und Schnittstelle)', async () => {
    expect((await fetch(basis + '/')).headers.get('x-robots-tag')).toContain('noindex');
    expect((await fetch(basis + '/api/status')).headers.get('x-robots-tag')).toContain('noindex');
  });
  it('POST auf Dateien: 405', async () => expect((await fetch(basis + '/', { method: 'POST' })).status).toBe(405));
});

describe('API über HTTP', () => {
  const anmelden = (kopf: Record<string, string> = {}) =>
    fetch(basis + '/api/geraete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...kopf },
      body: JSON.stringify({ id: crypto.randomUUID(), schluessel: hex(32) }),
    });
  it('Status meldet erkannte Adresse', async () => {
    expect((await fetch(basis + '/api/status')).headers.get('x-adresse-erkannt')).toBe('nein');
    expect((await fetch(basis + '/api/status', { headers: { 'X-Real-IP': '203.0.113.9' } })).headers.get('x-adresse-erkannt')).toBe('ja');
  });
  it('Gerät anmelden und Liste lesen (nie zwischenspeichern)', async () => {
    expect((await anmelden()).status).toBe(201);
    const l = await fetch(basis + '/api/becher');
    expect(l.status).toBe(200);
    expect(l.headers.get('cache-control')).toBe('no-store');
  });
  it('Limit zählt je echter Adresse (X-Real-IP), nicht je Proxy', async () => {
    for (let i = 0; i < 150; i++) await anmelden({ 'X-Real-IP': '198.51.100.1' });
    expect((await anmelden({ 'X-Real-IP': '198.51.100.1' })).status).toBe(429);
    expect((await anmelden({ 'X-Real-IP': '198.51.100.2' })).status).toBe(201);
  });
  it('gleicher Ursprung darf schreiben', async () => expect((await anmelden({ Origin: basis })).status).toBe(201));
  it('fremder Ursprung beim Schreiben: 403', async () => expect((await anmelden({ Origin: 'https://boese.example' })).status).toBe(403));
  it('zu große Anfrage: 413', async () => {
    const r = await fetch(basis + '/api/geraete', { method: 'POST', body: 'x'.repeat(80_000) });
    expect(r.status).toBe(413);
  });
  it('Admin ohne Token: 401', async () => expect((await fetch(basis + '/api/admin/meldungen')).status).toBe(401));
});

describe('Datenbank', () => {
  it('Daten überstehen einen Neustart, Migrationen laufen nur einmal', async () => {
    await fetch(basis + '/api/geraete', { method: 'POST', body: JSON.stringify({ id: 'g'.repeat(20), schluessel: hex(32) }) });
    db.schliessen();
    db = oeffneDatenbank(resolve(ordner, 'daten', 'g.sqlite'), MIGR);
    const z = db.sqlite.prepare('SELECT COUNT(*) AS n FROM geraete').get() as { n: number };
    expect(z.n).toBe(1);
  });
  it('Sicherung ist lesbar, Rotation behält 14', () => {
    db.sqlite.exec("INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES ('x','h',1)");
    const sich = resolve(ordner, 's');
    let letzte = '';
    for (let t = 1; t <= 20; t++) letzte = sichere(db, sich, new Date(Date.UTC(2026, 10, t)));
    expect(readdirSync(sich).length).toBe(14);
    const kopie = oeffneDatenbank(letzte, MIGR);
    expect((kopie.sqlite.prepare('SELECT COUNT(*) AS n FROM geraete').get() as { n: number }).n).toBe(1);
    kopie.schliessen();
  });
});
