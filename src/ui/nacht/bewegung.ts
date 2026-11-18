// Kleine Bewegungs-Bausteine auf Basis von Motion (motion.dev, dieselbe Engine wie Framer Motion, aber ohne React:
// läuft mit Preact und lädt nur, was gebraucht wird). Alles hier respektiert „Bewegung reduzieren".
import { animate, hover, press, stagger } from 'motion';
import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

export const weniger = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mitMaus = (): boolean => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Kinder mit data-ein fahren gestaffelt ein (Einblenden, leicht hochschieben, Unschärfe auflösen).
 * Der Ausgangszustand wird vor dem ersten Zeichnen gesetzt, damit nichts aufblitzt.
 */
export function useEinblenden<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || weniger()) return;
    const kinder = [...el.querySelectorAll<HTMLElement>('[data-ein]')];
    for (const k of kinder) {
      k.style.opacity = '0';
      k.style.transform = 'translateY(16px)';
    }
    const a = animate(
      kinder,
      { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'], filter: ['blur(6px)', 'blur(0px)'] },
      { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: stagger(0.06) },
    );
    a.finished.then(() => {
      for (const k of kinder) {
        k.style.opacity = '';
        k.style.transform = '';
        k.style.filter = '';
      }
    });
    return () => a.stop();
  }, []);
  return ref;
}

/**
 * Karte neigt sich zur Maus (nur mit echter Maus) und leuchtet an der Stelle auf (--mx, --my).
 * Auf dem Telefon federt die Karte beim Antippen kurz ein.
 */
export function useNeigung<T extends HTMLElement>(staerke = 7): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || weniger()) return;
    const stoppen: Array<() => void> = [];

    if (mitMaus()) {
      const bewege = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        animate(
          el,
          { transform: `perspective(900px) rotateX(${(0.5 - y) * staerke}deg) rotateY(${(x - 0.5) * staerke}deg) scale(1.015)` },
          { type: 'spring', stiffness: 220, damping: 20 },
        );
      };
      el.addEventListener('pointermove', bewege);
      stoppen.push(() => el.removeEventListener('pointermove', bewege));
      stoppen.push(
        hover(el, () => () => {
          animate(el, { transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)' }, { type: 'spring', stiffness: 160, damping: 18 });
        }),
      );
    }
    stoppen.push(
      press(el, () => {
        animate(el, { scale: 0.97 }, { duration: 0.12 });
        return () => animate(el, { scale: 1 }, { type: 'spring', stiffness: 380, damping: 16 });
      }),
    );
    return () => stoppen.forEach((s) => s());
  }, [staerke]);
  return ref;
}

/** Zahl läuft von 0 auf den Wert. Bei „Bewegung reduzieren" sofort der Endwert. */
export function useZaehler(ziel: number | null, stellen = 2, dauer = 0.9): string {
  const text = (v: number) => v.toFixed(stellen);
  const [wert, setWert] = useState<string>(ziel === null ? '–' : weniger() ? text(ziel) : text(0));
  useEffect(() => {
    if (ziel === null) return setWert('–');
    if (weniger()) return setWert(text(ziel));
    const a = animate(0, ziel, { duration: dauer, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setWert(text(v)) });
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziel]);
  return wert;
}
