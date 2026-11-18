import { describe, expect, it } from 'vitest';
import { besuchIdAusBytes, besuchsLink, leseBesuch, type Besuch } from './besuch';
import { GRENZEN } from './community';

const BASIS = 'https://zonkgoku.github.io/Becherwerk/';
const nachHash = (link: string) => link.split('#/mitbewerten?')[1];

describe('besuchsLink und leseBesuch', () => {
  const faelle: [string, Besuch][] = [
    ['einfach', { id: 'abcd2345', stand: 'Salz Chrom', markt: 'Rathausmarkt' }],
    ['mit allen Feldern', { id: 'abcd2345', stand: 'Glühweinkönig', markt: 'Christkindlesmarkt', stadt: 'Nürnberg', sorte: 'kirsch' }],
    ['Sonderzeichen', { id: 'abcd2345', stand: 'Tom & Jerry\'s #1 (100% +bio)', markt: 'Markt / Platz?', stadt: 'Garmisch-Partenkirchen' }],
    ['Emoji wie im alten Sheet', { id: 'abcd2345', stand: 'Ikea Altona 💛💙', markt: 'Ikea Altona' }],
    ['Umlaute und ß', { id: 'abcd2345', stand: 'Äpfel Öl Über Straße', markt: 'Spitalerstraße', stadt: 'Düsseldorf' }],
  ];
  it.each(faelle)('Rundreise: %s', (_n, b) => {
    const r = leseBesuch(nachHash(besuchsLink(BASIS, b)));
    expect(r).toEqual({ ok: true, besuch: b });
  });

  it('Link ist reines ASCII ohne "+" (robust im QR-Code)', () => {
    const link = besuchsLink(BASIS, { id: 'abcd2345', stand: 'Glühweinkönig & Söhne', markt: 'Markt Platz', stadt: 'Nürnberg' });
    expect(link).toMatch(/^[\x21-\x7e]+$/);
    expect(link).not.toContain('+');
    expect(link).toContain('%20');
  });

  it('ein vorhandener # in der Basis wird nicht doppelt', () => {
    expect(besuchsLink('https://x.de/app/#/erfassen', { id: 'abcd2345', stand: 'A', markt: 'B' }).match(/#/g)).toHaveLength(1);
  });

  it('typischer Link bleibt kurz genug für einen gut scanbaren QR-Code', () => {
    const link = besuchsLink(BASIS, { id: 'abcd2345', stand: 'Glühweinkönig', markt: 'Christkindlesmarkt', stadt: 'Nürnberg', sorte: 'rot' });
    expect(link.length).toBeLessThan(200);
  });

  it('der längste erlaubte Besuch passt noch in einen QR-Code (Version 40, Stufe M: 2331 Bytes)', () => {
    const link = besuchsLink(BASIS, { id: 'a'.repeat(32), stand: 'ü'.repeat(GRENZEN.stand), markt: 'ü'.repeat(GRENZEN.markt), stadt: 'ü'.repeat(GRENZEN.stadt), sorte: 'feuerzangen' });
    expect(link.length).toBeLessThan(2331);
  });
});

describe('leseBesuch lehnt Fremdes ab', () => {
  const gut = 'b=abcd2345&s=Stand&m=Markt';
  it('nimmt das Minimum an', () => expect(leseBesuch(gut).ok).toBe(true));
  it('mit führendem ?', () => expect(leseBesuch('?' + gut).ok).toBe(true));

  it.each([
    ['ohne Besuchs-Nr.', 's=Stand&m=Markt'],
    ['Besuchs-Nr. zu kurz', 'b=abc&s=Stand&m=Markt'],
    ['Besuchs-Nr. mit Sonderzeichen', 'b=ab%20cd&s=Stand&m=Markt'],
    ['Besuchs-Nr. mit Skript', 'b=%3Cscript%3E&s=Stand&m=Markt'],
    ['ohne Stand', 'b=abcd2345&m=Markt'],
    ['leerer Stand', 'b=abcd2345&s=%20&m=Markt'],
    ['ohne Markt', 'b=abcd2345&s=Stand'],
    ['Stand zu lang', `b=abcd2345&s=${'x'.repeat(GRENZEN.stand + 1)}&m=Markt`],
    ['Link im Stand', 'b=abcd2345&s=http%3A%2F%2Fspam.de&m=Markt'],
    ['Link im Markt', 'b=abcd2345&s=Stand&m=www.spam.de'],
    ['Link in der Stadt', 'b=abcd2345&s=Stand&m=Markt&c=https%3A%2F%2Fx.de'],
    ['unbekannte Sorte', 'b=abcd2345&s=Stand&m=Markt&t=glitzer'],
    ['nichts', ''],
  ])('%s', (_n, q) => {
    expect(leseBesuch(q).ok).toBe(false);
  });

  it('Steuerzeichen und doppelte Leerzeichen werden gesäubert', () => {
    const r = leseBesuch('b=abcd2345&s=Salz%00%20%20Chrom&m=Markt');
    expect(r.ok && r.besuch.stand).toBe('Salz Chrom');
  });

  it('Markup im Namen bleibt Text (die Oberfläche setzt es nie als HTML ein)', () => {
    const r = leseBesuch('b=abcd2345&s=%3Cb%3EFett%3C%2Fb%3E&m=Markt');
    expect(r.ok && r.besuch.stand).toBe('<b>Fett</b>');
  });

  it('Fehlertexte verraten nichts über das Innere', () => {
    const r = leseBesuch('b=abcd2345&s=http%3A%2F%2Fx.de&m=Markt');
    expect(!r.ok && r.grund).toBe('Der Link ist ungültig.');
  });
});

describe('besuchIdAusBytes', () => {
  it('liefert gültige IDs aus dem Alphabet ohne verwechselbare Zeichen', () => {
    for (let i = 0; i < 200; i++) {
      const id = besuchIdAusBytes(crypto.getRandomValues(new Uint8Array(8)));
      expect(id).toMatch(/^[a-hj-km-np-z2-9]{8}$/);
      expect(leseBesuch(`b=${id}&s=A&m=B`).ok).toBe(true);
    }
  });
  it('ist bei gleichen Bytes gleich', () => {
    expect(besuchIdAusBytes(new Uint8Array([0, 1, 2, 3]))).toBe(besuchIdAusBytes(new Uint8Array([0, 1, 2, 3])));
  });
});
