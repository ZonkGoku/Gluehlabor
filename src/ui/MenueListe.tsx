// Gruppierte Link-Liste (Eintrag mit Symbol, Titel, Kurztext und Pfeil). Wird auf „Ich" für Hilfe, Einstellungen und Prüfstelle benutzt.
import { t } from '../i18n';
import { Symbol } from './Symbol';

export interface Punkt {
  href: string;
  symbol: string;
  titel: string;
  text?: string;
}

export function Gruppe({ titel, punkte }: { titel: string; punkte: Punkt[] }) {
  return (
    <section class="mb-5" aria-label={t(titel)}>
      <h2 class="etikett mb-2 !text-gold-300">{t(titel)}</h2>
      <ul class="glas divide-y divide-[var(--nm-rand)] overflow-hidden rounded-3xl">
        {punkte.map((p) => (
          <li>
            <a href={p.href} class="flex min-h-[56px] items-center gap-3.5 px-4 py-2.5 text-eis no-underline transition hover:bg-flaeche-hover">
              <span class="grid size-9 shrink-0 place-items-center rounded-xl border border-rand bg-flaeche text-gold-300">
                <Symbol name={p.symbol} groesse={20} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[16px] font-semibold">{t(p.titel)}</span>
                {p.text && <span class="block text-[13px] leading-snug text-dunst">{t(p.text)}</span>}
              </span>
              <span aria-hidden="true" class="text-dunst">›</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
