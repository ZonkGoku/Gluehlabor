// Drei gezeichnete Gesichter für Rückmeldungen: 1 schlecht, 2 okay, 3 gut.
const FARBE = { 1: '#e0526a', 2: '#e8b84a', 3: '#4cbf7a' } as const;
export const STIMMUNGEN = [1, 2, 3] as const;
export type Stimmung = (typeof STIMMUNGEN)[number];
export const STIMMUNG_NAME: Record<Stimmung, string> = { 1: 'Schlecht', 2: 'Geht so', 3: 'Gut' };

export function StimmungIcon({ stimmung, groesse = 40 }: { stimmung: Stimmung; groesse?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={groesse} height={groesse} aria-hidden="true" stroke-linecap="round">
      <circle cx="16" cy="16" r="13" fill={FARBE[stimmung]} stroke="currentColor" stroke-width="1.6" />
      <circle cx="11.5" cy="13" r="1.7" fill="#1a1020" />
      <circle cx="20.5" cy="13" r="1.7" fill="#1a1020" />
      {stimmung === 3 && <path d="M10 18.5q6 6 12 0" fill="none" stroke="#1a1020" stroke-width="1.9" />}
      {stimmung === 2 && <path d="M11 20.5h10" fill="none" stroke="#1a1020" stroke-width="1.9" />}
      {stimmung === 1 && <path d="M10.5 22q5.5-5 11 0" fill="none" stroke="#1a1020" stroke-width="1.9" />}
    </svg>
  );
}
