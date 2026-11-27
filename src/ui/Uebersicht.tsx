// Startseite. Drei Dinge: bewerten, die Besten in deiner Stadt, was gerade bewertet wurde. Alles andere steht unter „Entdecken".
// Alle Zahlen kommen aus src/lib; hier wird nur angeordnet.
import { useState } from 'preact/hooks';
import { abendDatum } from '../lib/abend';
import { filtere } from '../lib/auswertung';
import { ortText, staedte } from '../lib/orte';
import { abend, neuesteBecher } from '../lib/startseite';
import { bewerte } from '../lib/scoring';
import { Betreiber } from './bausteine';
import { setzeName } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { anzeigeName, istPruefstelle, pruefeName } from '../lib/community';
import { FotoLeiste } from './Fotos';
import { InstallKarte } from './InstallKarte';
import { RennenKarte } from './schlitten/RennenLeiste';
import { useEintraege, useGeraetId, useGewichte, useMeineAnzahl, useName, useSaison } from './daten';
import { leseZuletzt } from '../daten/zuletzt';
import { useEinblenden } from './nacht/bewegung';
import { SterneZeile } from './nacht/SterneWert';
import { StandZeile } from './nacht/StandKarten';
import { baueStaende } from '../lib/staende';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';
import { t } from '../i18n';

/** Ohne Namen bleiben Bewertungen auf dem Gerät: Die Frage kommt, wenn noch kein Name da ist. */
function NameKarte() {
  const name = useName();
  const [wert, setWert] = useState('');
  const [fehler, setFehler] = useState('');
  if (name) return null;
  const speichern = async () => {
    const p = pruefeName(wert);
    if (!p.ok) return setFehler(p.grund);
    if (p.name === null) return setFehler('Bitte einen Namen eingeben.');
    await setzeName(p.name);
    void synchronisiere();
  };
  return (
    <div class="name-karte">
      <label for="name-start">{t('Dein Name?')}</label>
      <div class="name-zeile">
        <input
          id="name-start"
          class="feld"
          type="text"
          maxLength={24}
          autocomplete="nickname"
          placeholder={t('Name oder Spitzname')}
          value={wert}
          onInput={(e) => {
            setWert((e.target as HTMLInputElement).value);
            setFehler('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && void speichern()}
        />
        <button type="button" class="pillknopf" onClick={() => void speichern()}>
          {t('Speichern')}
        </button>
      </div>
      <p class="name-hinweis">
        {t('Öffentlich sichtbar. Ein Spitzname reicht.')}
        {fehler && <span class="name-fehler"> {t(fehler)}</span>}
      </p>
    </div>
  );
}

const GOLD_KNOPF = { background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' };

const AUSWAHL =
  'glas appearance-none rounded-full py-2.5 pl-4 pr-9 text-base font-semibold text-eis outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400/70 min-h-[44px]';

/** Erste Begegnung: sagt in einem Satz, was die App ist, und bietet genau einen Weg an. */
function Willkommen() {
  const schritte = [
    { symbol: 'becher', text: 'Bewerten' },
    { symbol: 'teilen', text: 'Teilen' },
    { symbol: 'pokal', text: 'Rangliste' },
  ] as const;
  return (
    <section data-ein class="glas rahmen-licht mb-5 mt-2 rounded-3xl p-5">
      <p class="etikett !text-gold-300">{t('Die Glühwein-Rangliste von Besuchern')}</p>
      <h1 class="mt-2 font-display text-[38px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Wo gibt’s den besten Glühwein?')}</h1>
      <p class="mt-3 text-base text-eis/90">{t('Alle bewerten ihren Glühwein, daraus entsteht die Rangliste. Ohne Konto.')}</p>
      <ol class="mt-4 flex items-center justify-between gap-1" aria-label={t('So geht es')}>
        {schritte.map((x, i) => (
          <>
            <li class="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span class="grid size-12 place-items-center rounded-full border border-gold-400/60 text-gold-300">
                <Symbol name={x.symbol} groesse={24} />
              </span>
              <span class="text-sm font-semibold text-eis">{t(x.text)}</span>
            </li>
            {i < schritte.length - 1 && <span aria-hidden="true" class="pb-6 text-dunst">→</span>}
          </>
        ))}
      </ol>
      <a
        href="#/erfassen"
        class="animate-puls mt-5 flex min-h-[56px] items-center justify-center gap-2 rounded-full px-6 text-lg font-semibold text-[#1a1020] no-underline"
        style={GOLD_KNOPF}
      >
        <Symbol name="plus" groesse={20} /> {t('Jetzt bewerten')}
      </a>
      <p class="mt-3 text-xs text-dunst">{t('Nur ab 18. Trink verantwortungsvoll.')}</p>
    </section>
  );
}

/** Wer heute Abend schon bewertet hat: Stand der Runde und der Weg zum nächsten Becher oder zum QR-Code. */
function HeuteAbend({ a, besuchId }: { a: ReturnType<typeof abend>; besuchId?: string }) {
  return (
    <section data-ein class="glas rahmen-licht mb-5 mt-2 rounded-3xl p-5">
      <p class="etikett !text-gold-300">{t('Heute Abend')}</p>
      <p class="mt-1 font-display text-[34px] uppercase leading-none tracking-wide text-eis">
        {a.anzahl === 1 ? t('1 Glühwein bewertet') : t('{n} Glühweine bewertet', { n: a.anzahl })}
        {a.mittel !== null && <span class="ml-2 text-gold-300"><SterneZeile wert={a.mittel} groesse={22} /></span>}
      </p>
      <a
        href="#/erfassen"
        class="animate-puls mt-4 flex min-h-[56px] items-center justify-center gap-2 rounded-full px-5 text-base font-semibold text-[#1a1020] no-underline"
        style={GOLD_KNOPF}
      >
        <Symbol name="plus" groesse={20} /> {t('Nächsten Glühwein bewerten')}
      </a>
      {besuchId && (
        <a href={`#/teilen?e=${encodeURIComponent(besuchId)}`} class="mt-2 flex min-h-[44px] items-center justify-center text-sm font-semibold text-gold-300 no-underline">
          {t('QR-Code für die Gruppe zeigen')}
        </a>
      )}
    </section>
  );
}

export function Uebersicht() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const meineAnzahl = useMeineAnzahl();
  const [saison] = useSaison(alle);
  const [stadtWahl, setStadtWahl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('gluehlabor.startstadt') ?? leseZuletzt()[0]?.stadt ?? null;
    } catch {
      return null;
    }
  });
  const raster = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jetzt = new Date();
  const heute = abendDatum(jetzt);
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  // Standard: die Stadt mit den meisten Bewertungen. Wer schon eine Stadt gewählt oder benutzt hat, behält sie.
  const stadtListe = staedte(MARKTLISTE, auswahl).filter((x): x is typeof x & { stadt: string } => x.stadt !== null);
  const stadt = stadtWahl && (stadtWahl === 'alle' || stadtListe.some((x) => x.stadt === stadtWahl)) ? stadtWahl : (stadtListe[0]?.stadt ?? 'alle');
  const staendeStadt = stadt === 'alle' ? baueStaende(auswahl, MARKTLISTE, gewichte) : baueStaende(filtere(auswahl, { saison: 'alle', markt: 'alle', stadt }, MARKTLISTE), MARKTLISTE, gewichte);
  const waehleStadt = (neu: string) => {
    setStadtWahl(neu);
    try {
      localStorage.setItem('gluehlabor.startstadt', neu);
    } catch {
      /* egal */
    }
  };

  // Heute Abend: nur die eigenen Bewertungen dieses Geräts zählen, nicht die der Community.
  const meine = alle.filter((e) => e.geraet === geraetId);
  const heuteAbend = abend(meine, heute, gewichte);
  const letzter = neuesteBecher(
    meine.filter((e) => e.datum === heute && e.besuchId),
    1,
  )[0];
  // „Gerade bewertet": nur echte Bewertungen von Leuten, nicht die Bestandsdaten von 2025
  const neueste = neuesteBecher(
    alle.filter((e) => e.sync !== 'bestand' && !e.id.startsWith('import-')),
    3,
  );

  return (
    <div class="nm">
      {heuteAbend.anzahl > 0 ? <HeuteAbend a={heuteAbend} besuchId={letzter?.id} /> : <Willkommen />}
      {meineAnzahl > 0 && (
        <div class="mb-4 empty:hidden">
          <NameKarte />
        </div>
      )}

      <div ref={raster}>
        <section data-ein aria-label={t('Die Besten')}>
          <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="font-display text-[28px] uppercase leading-none tracking-wide text-eis">{t('Die Besten in')}</h2>
            <label class="relative">
              <span class="sr-only">{t('Stadt')}</span>
              <select class={AUSWAHL} value={stadt} onChange={(ev) => waehleStadt((ev.target as HTMLSelectElement).value)}>
                <option value="alle">{t('ganz Deutschland')}</option>
                {stadtListe.map((x) => (
                  <option value={x.stadt}>{x.stadt}</option>
                ))}
              </select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-dunst">
                <Symbol name="pfeil" groesse={14} />
              </span>
            </label>
          </div>
          {staendeStadt.length === 0 ? (
            <div class="glas rounded-3xl p-6 text-center">
              <p class="font-display text-2xl uppercase tracking-wide text-eis">{t('Noch keine Bewertung hier')}</p>
              <p class="mt-2 text-dunst">{t('Sei die oder der Erste in {stadt}.', { stadt: stadt === 'alle' ? t('deiner Stadt') : stadt })}</p>
            </div>
          ) : (
            <>
              <ol class="space-y-2">
                {staendeStadt.slice(0, 3).map((s) => (
                  <li>
                    <StandZeile stand={s} />
                  </li>
                ))}
              </ol>
              <a href="#/rangliste" class="mt-1 flex min-h-[48px] items-center justify-end text-sm font-semibold text-gold-300 no-underline hover:text-gold-400">
                {t('Ganze Rangliste ansehen')} →
              </a>
            </>
          )}
        </section>

        {neueste.length > 0 && (
          <section data-ein class="mt-6" aria-label={t('Gerade bewertet')}>
            <h2 class="mb-3 font-display text-[28px] uppercase leading-none tracking-wide text-eis">{t('Gerade bewertet')}</h2>
            <ul class="space-y-2">
              {neueste.map((e) => (
                <li>
                  <a
                    href={`#/becher/${encodeURIComponent(e.id)}`}
                    class="flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-3 text-eis no-underline transition hover:border-[var(--nm-rand-stark)] hover:bg-flaeche-hover"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[17px] font-semibold">{e.stand}</span>
                      <span class="mt-1 block text-sm">
                        <SterneZeile wert={bewerte(e.noten, gewichte).gesamt} />
                      </span>
                      <span class="block truncate text-sm text-dunst">
                        {[ortText(MARKTLISTE, e), istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <FotoLeiste />

        <div data-ein class="mt-6">
          <RennenKarte />
        </div>

        <a
          data-ein
          href="#/entdecken"
          class="glas mt-6 flex min-h-[56px] items-center justify-between gap-3 rounded-2xl px-4 py-3 text-eis no-underline"
        >
          <span>
            <b class="block text-base">{t('Mehr entdecken')}</b>
            <span class="block text-sm text-dunst">{t('Karte, Top Deals, Preise')}</span>
          </span>
          <span aria-hidden="true" class="text-xl text-gold-300">→</span>
        </a>
      </div>

      <div class="mt-6 empty:hidden">
        <InstallKarte />
      </div>
      <Betreiber />
    </div>
  );
}
