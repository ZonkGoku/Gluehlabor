import { describe, expect, it } from 'vitest';
import { fehlendeAngaben, hinweise } from './betreiber';

const voll = { name: 'Erika Mustermann', strasse: 'Musterweg 1', ort: '20095 Hamburg', email: 'kontakt@example.org' };

describe('fehlendeAngaben', () => {
  it('vollständig: nichts fehlt, Telefon ist freiwillig', () => expect(fehlendeAngaben(voll)).toEqual([]));
  it('leer: Name, Ort und E-Mail sind Pflicht', () => {
    expect(fehlendeAngaben({ name: '', strasse: '', ort: '', email: '' })).toEqual(['Name', 'Ort', 'E-Mail-Adresse']);
  });
  it('ohne Straße ist der Start möglich, es gibt aber einen Hinweis', () => {
    const ohne = { ...voll, strasse: '' };
    expect(fehlendeAngaben(ohne)).toEqual([]);
    expect(hinweise(ohne)).toHaveLength(1);
    expect(hinweise(voll)).toEqual([]);
  });
  it('nur Leerzeichen zählt als leer', () => expect(fehlendeAngaben({ ...voll, name: '   ' })).toEqual(['Name']));
  it('kaputte E-Mail', () => expect(fehlendeAngaben({ ...voll, email: 'kein-at-zeichen' })).toEqual(['gültige E-Mail-Adresse']));
});
