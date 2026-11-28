// „Meine Bewertungen“: die eigene Rangliste (Favoriten) und alle eigenen Bewertungen, mit Ändern und, falls der Server eine nicht angenommen hat, dem Grund.
import { db } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { t, tn } from '../i18n';
import { sterne1, bewerte } from '../lib/scoring';
import { gruppenwert, standId } from '../lib/staende';
import { ortText } from '../lib/orte';
import { Betreiber, datumKurz } from './bausteine';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { SterneZeile } from './nacht/SterneWert';
import { MARKTLISTE } from './stammdaten';
import { KopfIcon } from './nacht/KopfIcon';

export function MeineBewertungen() {
  const alle = useEintraege();
  const ich = useGeraetId();
  const gewichte = useGewichte();
  if (!alle) return null;
  const meine = alle.filter((e) => e.geraet === ich && e.sync !== 'bestand' && !e.id.startsWith('import-')).sort((a, b) => b.erstelltAm - a.erstelltAm);

  // Meine Rangliste: je Stand mein Durchschnitt, beste zuerst
  const jeStand = new Map<string, typeof meine>();
  for (const e of meine) jeStand.set(standId(e, MARKTLISTE), [...(jeStand.get(standId(e, MARKTLISTE)) ?? []), e]);
  const favoriten = [...jeStand.entries()]
    .map(([id, liste]) => ({ id, stand: liste[0].stand, ort: ortText(MARKTLISTE, liste[0]), anzahl: liste.length, wert: gruppenwert(liste, gewichte).gesamt }))
    .filter((x) => x.wert !== null)
    .sort((a, b) => (sterne1(b.wert as number) - sterne1(a.wert as number)) || b.anzahl - a.anzahl || a.stand.localeCompare(b.stand, 'de'))
    .slice(0, 10);

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Nur für dich')}</p>
        <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Meine Bewertungen')}</h1>
        <p class="mt-2 text-dunst">{tn(meine.length, '{n} Bewertung', '{n} Bewertungen')}</p>
      </div>

      {meine.length === 0 ? (
        <div class="glas rounded-3xl p-6 text-center">
          <p class="m-0 text-[17px] text-eis">{t('Du hast noch nichts bewertet.')}</p>
          <a href="#/erfassen" class="mt-4 flex min-h-[52px] items-center justify-center rounded-full px-6 font-bold text-[#1a1020] no-underline" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
            {t('Jetzt bewerten')}
          </a>
        </div>
      ) : (
        <>
          <section aria-label={t('Meine Rangliste')}>
            <h2 class="mb-3 font-display text-[26px] uppercase leading-none tracking-wide text-eis"><KopfIcon name="pokal" groesse={22} />
              {t('Meine Rangliste')}
            </h2>
            <ol class="m-0 grid list-none gap-2 p-0">
              {favoriten.map((f, i) => (
                <li>
                  <a href={`#/stand/${encodeURIComponent(f.id)}`} class="glas flex min-h-[60px] items-center gap-3 rounded-2xl px-4 py-2 text-eis no-underline">
                    <span class="w-7 shrink-0 text-center font-display text-2xl text-gold-300">{i + 1}</span>
                    <span class="min-w-0 flex-1">
                      <b class="block truncate text-[16px]">{f.stand}</b>
                      <span class="block truncate text-sm text-dunst">{f.ort}</span>
                    </span>
                    <SterneZeile wert={f.wert} anzahl={f.anzahl} />
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <section class="mt-6" aria-label={t('Alle meine Bewertungen')}>
            <h2 class="mb-3 font-display text-[26px] uppercase leading-none tracking-wide text-eis"><KopfIcon name="rangliste" groesse={22} />
              {t('Alle meine Bewertungen')}
            </h2>
            <ul class="m-0 grid list-none gap-2 p-0">
              {meine.map((e) => (
                <li class="glas grid gap-2 rounded-2xl p-3">
                  <a href={`#/becher/${encodeURIComponent(e.id)}`} class="flex items-center gap-3 text-eis no-underline">
                    <span class="min-w-0 flex-1">
                      <b class="block truncate text-[16px]">{e.stand}</b>
                      <span class="block truncate text-sm text-dunst">{[ortText(MARKTLISTE, e), datumKurz(e.datum)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <SterneZeile wert={bewerte(e.noten, gewichte).gesamt} />
                  </a>
                  {e.sync === 'abgelehnt' && <p class="m-0 text-sm font-semibold text-[var(--warnung)]">{t('Nicht angenommen: {grund}', { grund: t(e.syncFehler ?? 'Grund unbekannt') })}</p>}
                  {e.sync === 'offen' && <p class="m-0 text-sm text-dunst">{e.syncFehler ? t(e.syncFehler) : t('Wird gesendet, sobald Netz da ist.')}</p>}
                  <div class="flex flex-wrap gap-2">
                    <a href={`#/aendern/${encodeURIComponent(e.id)}`} class="grid min-h-[44px] place-items-center rounded-full border-2 border-[var(--nm-bedienung)] px-5 text-sm font-semibold text-eis no-underline">
                      {t('Ändern')}
                    </a>
                    {e.sync === 'abgelehnt' && (
                      <>
                        <button
                          type="button"
                          class="min-h-[44px] rounded-full border-2 border-[var(--nm-bedienung)] px-5 text-sm font-semibold text-eis"
                          onClick={async () => {
                            await db.eintraege.update(e.id, { sync: 'offen', syncFehler: undefined });
                            void synchronisiere();
                          }}
                        >
                          {t('Nochmal senden')}
                        </button>
                        <button
                          type="button"
                          class="min-h-[44px] rounded-full px-4 text-sm text-dunst underline"
                          onClick={async () => {
                            if (confirm(t('Diese Bewertung von diesem Gerät löschen?'))) await db.eintraege.delete(e.id);
                          }}
                        >
                          {t('Löschen')}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <Betreiber />
    </div>
  );
}
