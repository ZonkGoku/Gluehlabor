// Schlichte Linien-Symbole (keine Emoji).
const PFADE: Record<string, string> = {
  uebersicht: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  rangliste: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  vergleich: 'M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
  statistik: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  spickzettel: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4',
  einstellungen: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  plus: 'M12 5v14M5 12h14',
  zurueck: 'M15 6l-6 6 6 6',
  schliessen: 'M6 6l12 12M18 6L6 18',
  pfeil: 'M9 6l6 6-6 6',
};

export function Symbol({ name, groesse = 22 }: { name: keyof typeof PFADE | string; groesse?: number }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PFADE[name]} />
    </svg>
  );
}
