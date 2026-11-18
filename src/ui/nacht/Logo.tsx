// Die Marke: zwei Köpfe mit Mützen (David & Philip) schauen einander an, dazwischen Kolben und dampfende Tasse in einem Strich.
// Die Zeichnung liegt als SVG in assets/logo-marke.svg und steht hier inline, damit sie bei jeder Größe scharf ist.
import marke from '../../../assets/logo-marke.svg?raw';
import { MARKE } from '../../marke';
import { t } from '../../i18n';

export function LogoMarke({ groesse = 40, strich }: { groesse?: number; strich?: number }) {
  return (
    <span
      aria-hidden="true"
      class="inline-block shrink-0 leading-[0]"
      style={{ width: `${groesse}px`, height: `${groesse}px`, ...(strich ? { '--sw': strich } : {}) }}
      dangerouslySetInnerHTML={{ __html: marke }}
    />
  );
}

/** GLÜHLABOR in kräftigen, weit gesetzten Versalien mit Lichtverlauf, darunter die Zeile in feinen Versalien. */
export function Wortmarke({ gross = false, tagline = true, klasse = '', taglineKlasse = '' }: { gross?: boolean; tagline?: boolean; klasse?: string; taglineKlasse?: string }) {
  return (
    <span class={`flex flex-col leading-none ${klasse}`}>
      <span class={`font-display uppercase licht-text pt-[0.2em] -mb-[0.1em] leading-[1.15] ${gross ? 'text-[30px] tracking-[0.16em]' : 'text-[19px] tracking-[0.1em] min-[440px]:text-[22px] min-[440px]:tracking-[0.14em]'}`}>{MARKE.name}</span>
      {tagline && (
        <span class={`whitespace-nowrap font-mono font-normal uppercase text-dunst ${gross ? 'mt-2 text-[10px] tracking-[0.3em]' : 'mt-1.5 text-[10px] tracking-[0.28em]'} ${taglineKlasse}`}>{t(MARKE.claim)}</span>
      )}
    </span>
  );
}
