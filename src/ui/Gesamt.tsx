// Die einfache Gesamtübersicht: wie viele Stände, Märkte, Städte und Bewertungen es insgesamt gibt (alle Saisons, ohne Ausgeblendete).
import { gesamtZahlen } from '../lib/startseite';
import { useEintraege } from './daten';
import { MARKTLISTE } from './stammdaten';
import { t } from '../i18n';

export function Gesamt() {
  const alle = useEintraege();
  if (!alle || alle.length === 0) return null;
  const z = gesamtZahlen(alle, MARKTLISTE);
  const felder: [number, string, string][] = [
    [z.staende, t('Stände'), '#/rangliste'],
    [z.maerkte, t('Märkte'), '#/entdecken'],
    [z.staedte, t('Städte'), '#/entdecken'],
    [z.bewertungen, t('Bewertungen'), '#/rangliste'],
  ];
  return (
    <section aria-label={t('Bisher bewertet')} class="mb-5">
      <p class="etikett mb-2 !text-gold-300">{t('Bisher bewertet')}</p>
      <ul class="grid grid-cols-4 gap-2">
        {felder.map(([n, name, href]) => (
          <li>
            <a href={href} class="glas flex min-h-[72px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-eis no-underline">
              <b class="font-display text-[28px] leading-none tracking-wide">{n}</b>
              <span class="mt-1 text-[12px] text-dunst">{name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
