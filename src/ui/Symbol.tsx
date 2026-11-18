// Schlichte Linien-Symbole (keine Emoji).
const PFADE: Record<string, string> = {
  uebersicht: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  rangliste: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  vergleich: 'M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
  statistik: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  spickzettel: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4',
  einstellungen: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 3.6-6 8-6s8 2 8 6',
  plus: 'M12 5v14M5 12h14',
  zurueck: 'M15 6l-6 6 6 6',
  schliessen: 'M6 6l12 12M18 6L6 18',
  pfeil: 'M9 6l6 6-6 6',
  pokal: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M10 17h4',
  teilen: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  flamme: 'M12 3c1 3.4 4 4.8 4 8.8a4 4 0 0 1-8 0c0-1.7.7-2.8 1.6-3.8C10.2 9.6 11.2 7.4 12 3z',
  becher: 'M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3.5c0 1 1 1 1 2.5M12 3.5c0 1 1 1 1 2.5',
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
