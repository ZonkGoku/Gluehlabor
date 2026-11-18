import { describe, expect, it } from 'vitest';
import { qrModule } from './qr';

describe('qrModule', () => {
  it('quadratisch, mit Suchmustern in den Ecken', () => {
    const m = qrModule('https://gluehlabor.de/#/stand/chrom%7Csalzburg');
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((z) => z.length === m.length)).toBe(true);
    expect(m[0][0] && m[0][6] && m[6][0] && m[6][6]).toBe(true); // Suchmuster oben links
  });
  it('gleicher Text, gleiche Matrix', () => {
    expect(qrModule('abc')).toEqual(qrModule('abc'));
  });
});
