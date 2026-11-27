// Fotos der Bewertungen eines Stands als Streifen: eigene Fotos von diesem Gerät und Fotos der Community vom Server (kleine Vorschau).
import { useEffect, useMemo } from 'preact/hooks';
import type { LokalerEintrag } from '../daten/db';
import { fotoAdresse } from '../daten/fotos';
import { t } from '../i18n';

export function FotoStreifen({ eintraege }: { eintraege: readonly LokalerEintrag[] }) {
  const mitFoto = eintraege.filter((e) => e.fotoBlob || e.foto);
  const schluessel = mitFoto.map((e) => `${e.id}${e.fotoBlob ? 'b' : 'r'}${e.foto ?? ''}`).join('|');
  const bilder = useMemo(
    () => mitFoto.map((e) => ({ id: e.id, stand: e.stand, blob: Boolean(e.fotoBlob), url: e.fotoBlob ? URL.createObjectURL(e.fotoBlob) : (fotoAdresse(e, true) as string) })),
    [schluessel],
  );
  useEffect(() => () => bilder.forEach((b) => b.blob && URL.revokeObjectURL(b.url)), [bilder]);
  if (bilder.length === 0) return null;
  return (
    <section class="mt-4" aria-label={t('Fotos')}>
      <div class="ohne-balken flex gap-2 overflow-x-auto">
        {bilder.map((u) => (
          <a href={`#/becher/${encodeURIComponent(u.id)}`} class="shrink-0">
            <img src={u.url} alt={t('Foto vom Stand {stand}', { stand: u.stand })} loading="lazy" decoding="async" class="size-28 rounded-2xl border border-rand object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}
