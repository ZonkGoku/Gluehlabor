// QR-Code zum gemeinsamen Bewerten. Funktioniert ohne Netz: Die Stammdaten stecken im Link.
import { db } from '../daten/db';
import { type Besuch } from '../lib/besuch';
import { TeilenBlock } from './TeilenBlock';
import { leseEntwurf } from '../daten/entwurf';
import { stadtVon, zerlegeFreienMarkt } from '../lib/orte';
import { useLive } from './hooks';
import { MARKTLISTE } from './stammdaten';
import { t } from '../i18n';

function queryDerAdresse(): URLSearchParams {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

/** Besuch aus dem Entwurf oder aus einem schon gespeicherten Becher (?e=<id>). */
async function ladeBesuch(): Promise<Besuch | null> {
  const eId = queryDerAdresse().get('e');
  if (eId) {
    const e = await db.eintraege.get(eId);
    if (!e?.besuchId) return null;
    return { id: e.besuchId, stand: e.stand, markt: e.markt, stadt: stadtVon(MARKTLISTE, e) ?? undefined, sorte: e.sorte };
  }
  const d = leseEntwurf();
  if (!d?.besuchId || !d.stand.trim()) return null;
  const frei = d.marktFrei ? zerlegeFreienMarkt(d.markt) : { markt: d.markt.trim() };
  const stadt = d.stadt ?? ('stadt' in frei ? frei.stadt : undefined) ?? stadtVon(MARKTLISTE, { markt: frei.markt }) ?? undefined;
  return { id: d.besuchId, stand: d.stand.trim(), markt: frei.markt, stadt, sorte: d.sorte };
}

export function Teilen() {
  const besuch = useLive(ladeBesuch, [location.hash], undefined as Besuch | null | undefined);
  const zurueck = queryDerAdresse().get('e') ? '#/' : '#/erfassen';

  if (besuch === undefined) return null;
  if (besuch === null) {
    return (
      <main class="fokus">
        <div class="karte leer">
          <b>{t('Hier gibt es noch nichts zu teilen.')}</b>
          {t('Trag zuerst den Stand ein, dann erscheint der QR-Code.')}
          <p style={{ margin: '14px 0 0' }}>
            <a class="pillknopf" href="#/erfassen">
              {t('Zur Erfassung')}
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main class="fokus">
      <a href={zurueck} class="mb-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-eis no-underline">
        <span aria-hidden="true">‹</span> {t('Zurück')}
      </a>
      <p class="eyebrow">{t('Gemeinsam bewerten')}</p>
      <h1 class="fokus-titel">{besuch.stand}</h1>
      <p class="fokus-unter">
        {besuch.markt}
        {besuch.stadt ? ` · ${besuch.stadt}` : ''}
      </p>

      <TeilenBlock besuch={besuch} />

      <div class="knopfreihe" style={{ justifyContent: 'center', marginTop: '16px' }}>
        <a class="knopf" href={zurueck} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', textDecoration: 'none', color: 'inherit' }}>
          {queryDerAdresse().get('e') ? t('Zurück') : t('Zurück zur Bewertung')}
        </a>
      </div>
    </main>
  );
}
