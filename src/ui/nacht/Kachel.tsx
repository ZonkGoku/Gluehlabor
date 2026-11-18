// Bento-Kachel aus Milchglas.
import type { ComponentChildren } from 'preact';

interface KachelProps {
  titel?: string;
  /** Kleiner Link rechts neben dem Titel. */
  link?: { href: string; text: string };
  /** Grid-Klassen (col-span, row-span …). */
  klasse?: string;
  children: ComponentChildren;
  innen?: string;
}

export function Kachel({ titel, link, klasse = '', innen = 'p-4', children }: KachelProps) {
  return (
    <section data-ein class={`glas rounded-3xl ${innen} ${klasse}`}>
      {titel && (
        <header class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="etikett !text-[11px] !font-medium">{titel}</h2>
          {link && (
            <a href={link.href} class="-my-3 inline-block py-3 text-sm font-medium text-gold-300 no-underline hover:text-gold-400">
              {link.text}
            </a>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

/** Kennzahl: große Zahl in der Schmuckschrift. */
export function Kennzahl({ wert, label }: { wert: string | number; label: string }) {
  return (
    <div data-ein class="glas flex flex-col justify-between rounded-3xl p-4">
      <div class="font-display text-[46px] leading-none text-gold-300 drop-shadow-[0_0_18px_rgb(255_200_87/0.35)]">{wert}</div>
      <div class="etikett mt-2">{label}</div>
    </div>
  );
}
