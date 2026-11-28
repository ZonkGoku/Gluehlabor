// Fotos aus der Community: ein Streifen für die Startseite und die Seite mit allen Fotos. Es zählen nur Fotos, die der Bewertende für alle freigegeben hat (liegen beim Server).
import { fotoAdresse } from '../daten/fotos';
import { t, tn } from '../i18n';
import { Betreiber } from './bausteine';
import { KopfIcon } from './nacht/KopfIcon';
import { useEintraege } from './daten';
import type { LokalerEintrag } from '../daten/db';

const mitFoto = (alle: readonly LokalerEintrag[]) => alle.filter((e) => e.foto).sort((a, b) => b.erstelltAm - a.erstelltAm);

/** Waagerechter Streifen mit den neuesten Fotos; nichts, wenn es noch keine gibt. */
export function FotoLeiste() {
  const alle = useEintraege();
  if (!alle) return null;
  const fotos = mitFoto(alle);
  if (fotos.length === 0) return null;
  return (
    <section data-ein class="mt-6" aria-label={t('Fotos aus der Community')}>
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h2 class="m-0 font-display text-[28px] uppercase leading-none tracking-wide text-eis">
          <KopfIcon name="kamera" groesse={22} />
          {t('Fotos')}
        </h2>
        <a href="#/fotos" class="min-h-[44px] py-3 text-sm font-semibold text-gold-300 no-underline">
          {t('Alle {n} Fotos', { n: fotos.length })} →
        </a>
      </div>
      <div class="ohne-balken flex gap-2 overflow-x-auto">
        {fotos.slice(0, 12).map((e) => (
          <a href={`#/becher/${encodeURIComponent(e.id)}`} class="shrink-0">
            <img src={fotoAdresse(e, true)} alt={t('Foto vom Stand {stand}', { stand: e.stand })} loading="lazy" decoding="async" class="size-24 rounded-2xl border border-rand object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}

/** Seite mit allen Fotos als Raster (neueste zuerst). */
export function Fotos() {
  const alle = useEintraege();
  if (!alle) return null;
  const fotos = mitFoto(alle);
  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Von allen für alle')}</p>
        <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Fotos')}</h1>
        <p class="mt-2 text-dunst">{tn(fotos.length, '{n} Foto', '{n} Fotos')}</p>
      </div>
      {fotos.length === 0 ? (
        <div class="glas rounded-3xl p-6 text-center">
          <p class="m-0 text-[17px] text-eis">{t('Noch keine Fotos. Mach beim Bewerten ein Foto und gib es für alle frei.')}</p>
          <a href="#/erfassen" class="mt-4 flex min-h-[52px] items-center justify-center rounded-full px-6 font-bold text-[#1a1020] no-underline" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
            {t('Jetzt bewerten')}
          </a>
        </div>
      ) : (
        <ul class="m-0 grid list-none grid-cols-3 gap-1.5 p-0 md:grid-cols-5">
          {fotos.map((e) => (
            <li>
              <a href={`#/becher/${encodeURIComponent(e.id)}`} class="block">
                <img src={fotoAdresse(e, true)} alt={t('Foto vom Stand {stand}', { stand: e.stand })} loading="lazy" decoding="async" class="aspect-square w-full rounded-xl border border-rand object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <Betreiber />
    </div>
  );
}
