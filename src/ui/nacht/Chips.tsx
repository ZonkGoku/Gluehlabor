// Umschalter als Milchglas-Pille. Aktiv: Lichtverlauf mit Leuchten.
interface ChipsProps<T extends string | number> {
  optionen: readonly T[];
  wert: T;
  onWahl: (w: T) => void;
  label: (w: T) => string;
  beschriftung: string;
}

export function Chips<T extends string | number>({ optionen, wert, onWahl, label, beschriftung }: ChipsProps<T>) {
  return (
    <div role="group" aria-label={beschriftung} class="nm glas inline-flex items-center gap-1 rounded-full p-1">
      {optionen.map((o) => (
        <button
          type="button"
          key={String(o)}
          aria-pressed={wert === o}
          onClick={() => onWahl(o)}
          class={`rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wider transition duration-200 ${
            wert === o ? 'text-[#1a1020] shadow-[0_0_22px_-4px_rgb(255_138_61/0.8)]' : 'text-dunst hover:text-eis'
          }`}
          style={wert === o ? { background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' } : undefined}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}
