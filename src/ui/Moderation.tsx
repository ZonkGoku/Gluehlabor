// Moderation im Browser, nur für Geräte, die sich mit dem Prüfstellen-Code ausgewiesen haben.
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../daten/config';
import { leseEinstellung } from '../daten/db';
import { aendereStand, entferne, entzieheZugang, fehlerText, ladeMeldungen, loescheGeraet, sperreGeraet, verstecke, verwirfMeldung, type Meldung } from '../daten/moderation';
import { MELDEGRUENDE } from '../daten/sync';
import { useEintraege, useGeraetId } from './daten';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { findeDubletten, type Dublette } from '../lib/dubletten';
import { baueStaende } from '../lib/staende';
import { zahl2 } from '../lib/format';
import { bewerte } from '../lib/scoring';
import { useGewichte } from './daten';
import { datumKurz } from './bausteine';
import { ortText } from '../lib/orte';
import { MARKTLISTE } from './stammdaten';
import { useLive } from './hooks';
import { t, tn } from '../i18n';

const KNOPF = 'glas rounded-full px-3.5 py-2 text-xs font-semibold text-eis transition hover:text-gold-300 disabled:opacity-50';
const FELD = 'glas w-full rounded-2xl px-3.5 py-2.5 text-sm text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70';
const grundText = (g: string) => t(MELDEGRUENDE.find((m) => m.wert === g)?.label ?? g);

export function Moderation() {
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const eigeneId = useGeraetId();
  const [liste, setListe] = useState<Meldung[] | null>(null);
  const [meldung, setMeldung] = useState('');
  const [loeschId, setLoeschId] = useState('');
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [suche, setSuche] = useState('');
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());

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

      {(() => {
        const dubletten = alle ? findeDubletten(baueStaende(alle, MARKTLISTE, gewichte)) : [];
        const namen = (st: Dublette['von']) => [...new Set(st.bewertungen.map((e) => (istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e))))].join(', ');
        const fuehrZusammen = (von: Dublette['von'], nach: Dublette['von']) =>
          confirm(t('„{a}" ({n} Bewertungen) in „{b}" zusammenführen? Wer bewertet hat, bleibt an jeder Bewertung erhalten.', { a: von.stand, n: von.bewertungen.length, b: nach.stand })) &&
          void tu(() => aendereStand(von.bewertungen.map((e) => e.id), nach.stand, nach.markt, nach.stadt ?? ''), 'Zusammengeführt.');
        return (
          <section class="glas mt-6 rounded-3xl p-4">
            <h2 class="etikett !text-[11px]">{t('Mögliche Doppelte')} · {dubletten.length}</h2>
            <p class="mt-1 text-xs text-dunst">{t('Gleiche Stadt, ähnlicher Name. Beim Zusammenführen bleibt an jeder Bewertung, wer sie abgegeben hat.')}</p>
            {dubletten.length === 0 && <p class="mt-2 text-sm text-dunst">{t('Keine Doppelten gefunden.')}</p>}
            <ul class="mt-2 grid gap-2">
              {dubletten.map((d) => (
                <li class="rounded-2xl border border-rand bg-flaeche p-3.5">
                  <p class="text-sm text-eis">
                    <b>{d.von.stand}</b> <span class="text-dunst">({tn(d.von.bewertungen.length, '{n} Bewertung', '{n} Bewertungen')}: {namen(d.von)})</span>
                  </p>
                  <p class="text-sm text-eis">
                    <b>{d.nach.stand}</b> <span class="text-dunst">({tn(d.nach.bewertungen.length, '{n} Bewertung', '{n} Bewertungen')}: {namen(d.nach)})</span>
                  </p>
                  <p class="mt-1 text-xs text-dunst">{[d.nach.stadt, d.nach.markt].filter(Boolean).join(' · ')}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" class={KNOPF} onClick={() => fuehrZusammen(d.von, d.nach)}>
                      {t('Alles zu „{b}"', { b: d.nach.stand })}
                    </button>
                    <button type="button" class={KNOPF} onClick={() => fuehrZusammen(d.nach, d.von)}>
                      {t('Alles zu „{b}"', { b: d.von.stand })}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <section class="glas mt-6 rounded-3xl p-4">
        <h2 class="etikett !text-[11px]">{t('Alle Bewertungen')}{alle ? ` · ${alle.length}` : ''}</h2>
        <p class="mt-1 text-xs text-dunst">{t('Testeinträge oder Unfug? Auswählen und endgültig löschen. Das lässt sich nicht rückgängig machen.')}</p>
        <input class={`${FELD} mt-2`} placeholder={t('Suchen: Stand, Stadt oder Name')} aria-label={t('Suchen: Stand, Stadt oder Name')} value={suche} onInput={(e) => setSuche((e.target as HTMLInputElement).value)} />
        {(() => {
          const q = suche.trim().toLowerCase();
          const treffer = (alle ?? [])
            .filter((e) => !q || `${e.stand} ${e.stadt ?? ''} ${e.markt} ${e.name ?? ''}`.toLowerCase().includes(q))
            .sort((a, b) => b.erstelltAm - a.erstelltAm);
          const sichtbar = treffer.slice(0, 150);
          const wahl = sichtbar.filter((e) => gewaehlt.has(e.id));
          const umschalten = (id: string) => setGewaehlt((g) => { const n = new Set(g); n.has(id) ? n.delete(id) : n.add(id); return n; });
          return (
            <>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" class={KNOPF} onClick={() => setGewaehlt(new Set(sichtbar.map((e) => e.id)))}>
                  {t('Alle sichtbaren wählen')}
                </button>
                <button type="button" class={KNOPF} disabled={gewaehlt.size === 0} onClick={() => setGewaehlt(new Set())}>
                  {t('Auswahl aufheben')}
                </button>
                <button
                  type="button"
                  class={`${KNOPF} !text-wein-400`}
                  disabled={wahl.length === 0}
                  onClick={() =>
                    confirm(t('{n} Bewertungen endgültig löschen? Das lässt sich nicht rückgängig machen.', { n: wahl.length })) &&
                    void tu(async () => { await entferne(wahl); setGewaehlt(new Set()); }, () => t('{n} Bewertungen gelöscht.', { n: wahl.length }))
                  }
                >
                  {t('Auswahl löschen ({n})', { n: wahl.length })}
                </button>
              </div>
              <ul class="mt-3 grid max-h-[60vh] gap-1.5 overflow-y-auto">
                {sichtbar.map((e) => (
                  <li>
                    <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3 py-2 text-sm">
                      <input type="checkbox" checked={gewaehlt.has(e.id)} onChange={() => umschalten(e.id)} aria-label={t('Auswählen: {stand}', { stand: e.stand })} />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold text-eis">{e.stand}</span>
                        <span class="block truncate text-xs text-dunst">
                          {[ortText(MARKTLISTE, e), datumKurz(e.datum) ?? t('Saison {s}', { s: e.saison }), istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span class="font-display text-xl text-gold-300">{zahl2(bewerte(e.noten, gewichte).gesamt)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {treffer.length > sichtbar.length && <p class="mt-2 text-xs text-dunst">{t('Es werden die neuesten {n} gezeigt. Mit der Suche findest du die übrigen.', { n: sichtbar.length })}</p>}
            </>
          );
        })()}
      </section>

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
