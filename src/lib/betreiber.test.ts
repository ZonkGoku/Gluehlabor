import { describe, expect, it } from 'vitest';
import { fehlendeAngaben } from './betreiber';

const voll = { name: 'Erika Mustermann', strasse: 'Musterweg 1', ort: '20095 Hamburg', email: 'kontakt@example.org' };

describe('fehlendeAngaben', () => {
  it('vollständig: nichts fehlt, Telefon ist freiwillig', () => expect(fehlendeAngaben(voll)).toEqual([]));
  it('leer: alle vier Pflichtangaben', () => {
    expect(fehlendeAngaben({ name: '', strasse: '', ort: '', email: '' })).toEqual(['Name', 'Straße und Hausnummer', 'Postleitzahl und Ort', 'E-Mail-Adresse']);
  });
  it('nur Leerzeichen zählt als leer', () => expect(fehlendeAngaben({ ...voll, name: '   ' })).toEqual(['Name']));
  it('kaputte E-Mail', () => expect(fehlendeAngaben({ ...voll, email: 'kein-at-zeichen' })).toEqual(['gültige E-Mail-Adresse']));
});
