// Ein Kriterium als Messbalken. Antippen setzt die Note an der Stelle,
// Wischen ändert sie live. Handschuhtauglich: die ganze Zeile ist Trefferfläche.

import { useRef } from 'preact/hooks';
import type { Note } from '../lib/modell';
import { t } from '../i18n';

interface Props {
  name: string;
  gewicht: number;
  wert: Note;
  aktiv: boolean;
  onWert: (n: Note) => void;
  onAktiv: () => void;
  onInfo: () => void;
}

function wertAusX(el: HTMLElement, clientX: number): number {
  const r = el.getBoundingClientRect();
  const anteil = (clientX - r.left) / r.width;
  return Math.min(10, Math.max(1, Math.ceil(anteil * 10)));
}

function Inhalt({ name, gewicht, wert }: { name: string; gewicht: number; wert: Note }) {
  return (
    <div class="skala-inhalt">
      <span class="name">{name}</span>
      <span class="gewicht">×{gewicht}</span>
      <span class={wert === null ? 'wert leer' : 'wert'}>{wert ?? '–'}</span>
    </div>
  );
}

export function Skala({ name, gewicht, wert, aktiv, onWert, onAktiv, onInfo }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const letzter = useRef<Note>(wert);
  letzter.current = wert;

  const setze = (n: number) => {
    if (n !== letzter.current) {
      letzter.current = n;
      onWert(n);
      navigator.vibrate?.(6);
    }
  };

  const down = (e: PointerEvent) => {
    const el = ref.current!;
    el.setPointerCapture(e.pointerId);
    onAktiv();
    setze(wertAusX(el, e.clientX));
  };
  const move = (e: PointerEvent) => {
    const el = ref.current!;
    if (el.hasPointerCapture(e.pointerId)) setze(wertAusX(el, e.clientX));
  };
  const taste = (e: KeyboardEvent) => {
    const w = letzter.current;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setze(Math.min(10, (w ?? 0) + 1));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setze(Math.max(1, (w ?? 2) - 1));
    else if (/^[1-9]$/.test(e.key)) setze(Number(e.key));
    else if (e.key === '0') setze(10);
    else if (e.key === 'Backspace' || e.key === 'Delete') onWert(null);
    else return;
    e.preventDefault();
  };

  const rechts = wert === null ? 100 : 100 - wert * 10;

  return (
    <div class="skala-zeile" data-aktiv={aktiv}>
      <div
        ref={ref}
        class="skala"
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={wert ?? undefined}
        aria-valuetext={wert === null ? t('nicht bewertet') : String(wert)}
        onPointerDown={down}
        onPointerMove={move}
        onFocus={onAktiv}
        onKeyDown={taste}
      >
        <Inhalt name={name} gewicht={gewicht} wert={wert} />
        <div class="skala-fuellung" aria-hidden="true" style={{ clipPath: `inset(0 ${rechts}% 0 0)` }}>
          <Inhalt name={name} gewicht={gewicht} wert={wert} />
        </div>
      </div>
      <button type="button" class="skala-info" aria-label={t('Anker {name}', { name })} onClick={onInfo}>
        Anker
      </button>
    </div>
  );
}
