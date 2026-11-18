// Moderation im Browser, nur für Geräte, die sich mit dem Prüfstellen-Code ausgewiesen haben.
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../daten/config';
import { leseEinstellung } from '../daten/db';
import { entzieheZugang, fehlerText, ladeMeldungen, loescheGeraet, sperreGeraet, verstecke, verwirfMeldung, type Meldung } from '../daten/moderation';
import { MELDEGRUENDE } from '../daten/sync';
import { useGeraetId } from './daten';
import { useLive } from './hooks';
import { t } from '../i18n';

const KNOPF = 'glas rounded-full px-3.5 py-2 text-xs font-semibold text-eis transition hover:text-gold-300 disabled:opacity-50';
const FELD = 'glas w-full rounded-2xl px-3.5 py-2.5 text-sm text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70';
const grundText = (g: string) => t(MELDEGRUENDE.find((m) => m.wert === g)?.label ?? g);

export function Moderation() {
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const eigeneId = useGeraetId();
  const [liste, setListe] = useState<Meldung[] | null>(null);
  const [meldung, setMeldung] = useState('');
  const [loeschId, setLoeschId] = useState('');

  const lade = async () => {
    try {
      setListe(await ladeMeldungen());
      setMeldung('');
    } catch (err) {
      setMeldung(fehlerText(err));
    }
  };
  useEffect(() => {
    if (pruefstelle && HAT_SERVER) void lade();
  }, [pruefstelle]);

  const tu = async (f: () => Promise<unknown>, ok: string | (() => string)) => {
    setMeldung(t('Einen Moment …'));
    try {
      await f();
      await lade();
      setMeldung(typeof ok === 'function' ? ok() : t(ok));
    } catch (err) {
      setMeldung(fehlerText(err));
    }
  };

  if (!pruefstelle || !HAT_SERVER) {
    return (
      <div class="nm">
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">{t('Nur für die Prüfstelle')}</p>
          <p class="mt-2 text-dunst">{t('Schalte dieses Gerät im Profil mit dem Prüfstellen-Code frei.')}</p>
          <a href="#/profil" class="mt-4 inline-block font-semibold text-gold-300 no-underline">
            {t('Zum Profil')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Prüfstelle')}</p>
        <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Moderation')}</h1>
        <p class="mt-2 text-sm text-dunst">
          {t('Meldungen abarbeiten, Bewertungen ausblenden, Geräte sperren. Stände benennst du auf ihrer eigenen Seite um oder führst sie zusammen.')}
        </p>
      </div>
      {meldung && (
        <p class="mb-3 text-sm text-gold-300" role="status">
          {meldung}
        </p>
      )}

      <h2 class="etikett !text-[11px]">{t('Offene Meldungen')} {liste ? `· ${liste.length}` : ''}</h2>
      {liste?.length === 0 && <p class="mt-2 text-dunst">{t('Keine offenen Meldungen.')}</p>}
      <ul class="mt-2 grid gap-2 md:grid-cols-2">
        {liste?.map((m) => (
          <li class="rounded-2xl border border-rand bg-flaeche p-3.5">
            <p class="font-semibold text-eis">
              {m.stand ?? t('Unbekannt')} <span class="font-normal text-dunst">· {m.markt ?? ''}</span>
            </p>
            <p class="text-xs text-dunst">
              {t('{n}× gemeldet:', { n: m.anzahl })} {[...new Set((m.gruende ?? '').split(','))].filter(Boolean).map(grundText).join(', ')} · {t('von {name}', { name: m.name ?? t('Anonym') })}
              {m.versteckt ? ` · ${t('schon ausgeblendet')}` : ''}
            </p>
            {m.notiz && <p class="mt-1 text-sm text-eis/90">„{m.notiz}"</p>}
            <div class="mt-2 flex flex-wrap gap-2">
              <a class={`${KNOPF} no-underline`} href={`#/becher/${encodeURIComponent(m.id)}`}>
                {t('Ansehen')}
              </a>
              {!m.versteckt && (
                <button type="button" class={KNOPF} onClick={() => tu(() => verstecke([m.id], true), 'Ausgeblendet.')}>
                  {t('Ausblenden')}
                </button>
              )}
              <button type="button" class={KNOPF} onClick={() => tu(() => verwirfMeldung(m.id), 'Meldung verworfen.')}>
                {t('Verwerfen')}
              </button>
              {m.geraet_id && m.geraet_id !== eigeneId && (
                <button
                  type="button"
                  class={KNOPF}
                  onClick={() => confirm(t('Dieses Gerät sperren? Alle seine Bewertungen werden ausgeblendet.')) && void tu(() => sperreGeraet(m.geraet_id!, true), 'Gerät gesperrt.')}
                >
                  {t('Gerät sperren')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section class="glas mt-6 rounded-3xl p-4">
        <h2 class="etikett !text-[11px]">{t('Löschen auf Anfrage')}</h2>
        <p class="mt-1 text-xs text-dunst">{t('Geräte-Kennung steht im Profil der Person. „Name" entfernt nur den Namen, „Alles" macht alle Bewertungen des Geräts unkenntlich.')}</p>
        <input class={`${FELD} mt-2`} placeholder={t('Geräte-Kennung')} aria-label={t('Geräte-Kennung')} value={loeschId} onInput={(e) => setLoeschId((e.target as HTMLInputElement).value.trim())} />
        <div class="mt-2 flex gap-2">
          <button type="button" class={KNOPF} disabled={loeschId.length < 16} onClick={() => tu(() => loescheGeraet(loeschId, 'name'), 'Name entfernt.')}>
            {t('Nur Namen löschen')}
          </button>
          <button
            type="button"
            class={KNOPF}
            disabled={loeschId.length < 16}
            onClick={() => confirm(t('Alle Bewertungen dieses Geräts unwiderruflich unkenntlich machen?')) && void tu(() => loescheGeraet(loeschId, 'alles'), 'Alles gelöscht.')}
          >
            {t('Alles löschen')}
          </button>
        </div>
      </section>

      <section class="glas mt-4 rounded-3xl p-4">
        <h2 class="etikett !text-[11px]">{t('Zugang entziehen')}</h2>
        <p class="mt-1 text-xs text-dunst">
          {t('Handy verloren? Danach verlieren alle anderen Geräte die Prüfstellen-Rechte. Ändere anschließend den Prüfstellen-Code beim Server, bevor du die Geräte neu freischaltest. Bisherige Prüfstellen-Siegel bleiben.')}
        </p>
        <button
          type="button"
          class={`${KNOPF} mt-2`}
          onClick={() => confirm(t('Allen anderen Geräten die Prüfstellen-Rechte entziehen?')) && void (async () => { let n = 0; await tu(async () => { n = await entzieheZugang(); }, () => t('Entzogen bei {n} Gerät(en).', { n })); })()}
        >
          {t('Anderen Geräten entziehen')}
        </button>
      </section>
    </div>
  );
}
