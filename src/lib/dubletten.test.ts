import { describe, expect, it } from 'vitest';
import { findeDubletten } from './dubletten';
import type { Stand } from './staende';

const stand = (name: string, stadt: string, n: number): Stand =>
  ({ id: `${name}|${stadt}`, stand: name, markt: 'X', stadt, bewertungen: Array.from({ length: n }) }) as unknown as Stand;

describe('findeDubletten', () => {
  it('erkennt Tippfehler-Varianten derselben Bude', () => {
    const d = findeDubletten([stand('Elbschlösdchen', 'Hamburg', 2), stand('Elbschlossen', 'Hamburg', 2)]);
    expect(d).toHaveLength(1);
    expect(d[0].grund).toBe('schreibweise');
  });
  it('der kleinere Stand wandert zum größeren', () => {
    const d = findeDubletten([stand('Elbschlossen', 'Hamburg', 1), stand('Elbschlösdchen', 'Hamburg', 3)]);
    expect(d[0].von.stand).toBe('Elbschlossen');
    expect(d[0].nach.stand).toBe('Elbschlösdchen');
  });
  it('erkennt einen im anderen enthaltenen Namen', () => {
    const d = findeDubletten([stand('Winterwald', 'Hamburg', 1), stand('Kleine Winterwald Schänke', 'Hamburg', 3)]);
    expect(d).toHaveLength(1);
    expect(d[0].grund).toBe('enthalten');
  });
  it('verschiedene Städte sind nie Doppelte', () => {
    expect(findeDubletten([stand('Elbschlösdchen', 'Hamburg', 1), stand('Elbschlossen', 'München', 1)])).toHaveLength(0);
  });
  it('Nummern unterscheiden Buden', () => {
    expect(findeDubletten([stand('Stand 8', 'München', 1), stand('Stand 9', 'München', 1)])).toHaveLength(0);
  });
  it('kurze Namen und völlig verschiedene bleiben unberührt', () => {
    expect(findeDubletten([stand('112', 'München', 1), stand('Wine bar', 'München', 1), stand('Main Bar', 'München', 1)])).toHaveLength(0);
  });
});
