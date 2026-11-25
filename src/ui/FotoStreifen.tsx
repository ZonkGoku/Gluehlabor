// Fotos der Bewertungen eines Stands als Streifen. Fotos liegen bisher nur auf dem Gerät, das sie gemacht hat.
import { useEffect, useMemo } from 'preact/hooks';
import type { LokalerEintrag } from '../daten/db';
import { t } from '../i18n';

export function FotoStreifen({ eintraege }: { eintraege: readonly LokalerEintrag[] }) {
  const mitFoto = eintraege.filter((e) => e.fotoBlob);
  const urls = useMemo(() => mitFoto.map((e) => ({ id: e.id, stand: e.stand, url: URL.createObjectURL(e.fotoBlob!) })), [mitFoto.map((e) => e.id).join('|')]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u.url)), [urls]);
  if (urls.length === 0) return null;
  return (
    <section class="mt-4" aria-label={t('Fotos')}>
      <div class="ohne-balken flex gap-2 overflow-x-auto">
        {urls.map((u) => (
          <a href={`#/becher/${encodeURIComponent(u.id)}`} class="shrink-0">
            <img src={u.url} alt={t('Foto vom Stand {stand}', { stand: u.stand })} class="size-28 rounded-2xl border border-rand object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}
