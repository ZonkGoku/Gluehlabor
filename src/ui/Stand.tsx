// Stand-Seite: eine Bude mit allen Bewertungen, dem Durchschnitt und, für die Prüfstelle, Pflegewerkzeugen.
import { useState } from 'preact/hooks';
import { fehlerText, aendereStand, entferne, verstecke } from '../daten/moderation';
import { HAT_SERVER } from '../daten/config';
import { entwurfHatInhalt, leseEntwurf, schreibeEntwurf } from '../daten/entwurf';
import { leseEinstellung, type LokalerEintrag } from '../daten/db';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { euro, sterneText } from '../lib/format';
import { KRITERIEN, leereNoten } from '../lib/modell';
import { ortText } from '../lib/orte';
import { bewerte, urteil } from '../lib/scoring';
import { baueStaende, kriterienMittel, MIN_BEWERTUNGEN, type Stand } from '../lib/staende';
import { datumKurz, UrteilPill } from './bausteine';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { useAktuell, useLive } from './hooks';
import { Kachel } from './nacht/Kachel';
import { StandTopKarte } from './nacht/StandKarten';
import { DealMarke } from './nacht/DealMarke';
import { HilfePunkt } from './nacht/HilfePunkt';
import { FotoStreifen } from './FotoStreifen';
import { SterneGross, SterneZeile } from './nacht/SterneWert';
import { Netzdiagramm, NotenBalken, type Reihe } from './Netzdiagramm';
import { SiegelEtikett } from './nacht/PruefSiegel';
import { ANKER, MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';
import { URTEILE } from '../lib/auswertung';
import { kriteriumLabel, t } from '../i18n';

const FELD = 'glas w-full rounded-2xl px-3.5 py-2.5 text-sm text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70';
const KNOPF = 'glas rounded-full px-4 py-2.5 text-sm font-semibold text-eis transition hover:text-gold-300 disabled:opacity-50';

export function StandSeite({ id }: { id: string }) {
  useAktuell();
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const [hinweis, setHinweis] = useState('');
  if (!alle) return null;

  const staende = baueStaende(alle, MARKTLISTE, gewichte, 'alle');
  const s = staende.find((x) => x.id === id);
  if (!s)
    return (
      <div class="nm">
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">{t('Diesen Stand gibt es nicht (mehr)')}</p>
          <p class="mt-2 text-dunst">{t('Vielleicht wurde er umbenannt oder zusammengeführt.')}</p>
          <a href="#/rangliste" class="mt-4 inline-block font-semibold text-gold-300 no-underline">
            {t('Zur Rangliste')}
          </a>
        </div>
      </div>
    );

  const frueher = s.bewertungen.some((e) => e.geraet === geraetId);

  const bewerten = () => {
    const angefangen = leseEntwurf();
    if (entwurfHatInhalt(angefangen) && !(angefangen?.stand === s.stand && angefangen?.gesperrt)) {
      if (!confirm(t('Du hast gerade eine angefangene Bewertung. Sie geht verloren, wenn du jetzt diesen Stand bewertest. Fortfahren?'))) return;
    }
    schreibeEntwurf({ stand: s.stand, markt: s.markt, marktFrei: false, stadt: s.stadt, gesperrt: true, notiz: '', noten: leereNoten() });
    location.hash = '#/erfassen';
  };

  const verteilung = Object.fromEntries(URTEILE.map((u) => [u, 0])) as Record<string, number>;
  for (const e of s.bewertungen) {
    const u = urteil(bewerte(e.noten, gewichte).gesamt);
    if (u) verteilung[u]++;
  }
  const maxVerteilung = Math.max(1, ...Object.values(verteilung));
  const mein = alle.find((e) => e.geraet === geraetId && s.bewertungen.some((b) => b.id === e.id) && e.besuchId);

  return (
    <div class="nm">
      <a class="zurueck" href="#/rangliste">
        <Symbol name="zurueck" groesse={18} /> {t('Rangliste')}
      </a>
      {s.pruefstelle.anzahl > 0 && (
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <SiegelEtikett text={t('Von David & Philip getestet: {n}', { n: s.pruefstelle.gesamt === null ? '–' : sterneText(s.pruefstelle.gesamt) })} />
          <HilfePunkt text={t('Von David & Philip getestet.')} />
        </div>
      )}
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <StandTopKarte stand={s} ohneLink ort={ortText(MARKTLISTE, { markt: s.markt, stadt: s.stadt })} hinweis={s.rang ? t('Platz {r} von {n}', { r: s.rang, n: staende.length }) : undefined} />
        <div class="grid content-start gap-3">
          <div class="grid grid-cols-2 gap-3">
            <Kachel innen="p-4">
              <p class="etikett">{t('Prüfstelle · David & Philip')}</p>
              <p class="mt-2">{s.pruefstelle.anzahl === 0 ? <span class="text-sm text-dunst">{t('noch nicht bewertet')}</span> : <SterneGross wert={s.pruefstelle.gesamt} anzahl={s.pruefstelle.anzahl} />}</p>
            </Kachel>
            <Kachel innen="p-4">
              <p class="etikett">{t('Community')}</p>
              <p class="mt-2">{s.community.anzahl === 0 ? <span class="text-sm text-dunst">{t('noch nicht bewertet')}</span> : <SterneGross wert={s.community.gesamt} anzahl={s.community.anzahl} />}</p>
            </Kachel>
          </div>
          <Kachel innen="p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="etikett">
                  {t('Preis-Leistung')}{' '}
                  <HilfePunkt text={t('Glühwein-Sterne, minus ¼ Stern je Euro über dem üblichen Preis.')} />
                </p>
                <p class="mt-2"><SterneGross wert={s.deal.punkte} /></p>
                <p class="mt-1 text-xs text-dunst">
                  {s.preis.median === null
                    ? t('noch kein Preis gemeldet')
                    : t('Preis: {preis} je 0,2 l · {n} Meldungen', { preis: euro(s.preis.median), n: s.preis.n })}
                </p>
              </div>
              {s.deal.top && <DealMarke gross />}
            </div>
          </Kachel>
          <button
            type="button"
            onClick={bewerten}
            class="animate-puls flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold text-[#1a1020] disabled:animate-none disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            <Symbol name="plus" groesse={18} /> {frueher ? t('Nochmal bewerten') : t('Diesen Stand bewerten')}
          </button>
          {mein && (
            <a class="text-center text-sm font-medium text-gold-300 no-underline hover:text-gold-400" href={`#/teilen?e=${encodeURIComponent(mein.id)}`}>
              {t('QR-Code zum Mitbewerten zeigen')}
            </a>
          )}
          {s.vorlaeufig && <p class="text-center text-xs text-dunst">{t('Erst wenige Bewertungen: die Sterne können sich noch ändern (ab {n} gelten sie als gesichert).', { n: MIN_BEWERTUNGEN })}</p>}
          <Kachel titel={t('Verteilung der Urteile')} innen="p-4">
            <ul class="space-y-1.5">
              {URTEILE.map((u) => (
                <li class="flex items-center gap-2 text-xs">
                  <span class="w-24 shrink-0 text-dunst">{t(u)}</span>
                  <span class="h-2 flex-1 overflow-hidden rounded-full bg-spur">
                    <span class="block h-full rounded-full" style={{ width: `${(verteilung[u] / maxVerteilung) * 100}%`, background: 'linear-gradient(90deg,var(--nm-licht-1),var(--color-glut-500))' }} />
                  </span>
                  <span class="w-5 text-right font-mono text-eis">{verteilung[u]}</span>
                </li>
              ))}
            </ul>
          </Kachel>
        </div>
      </div>

      <FotoStreifen eintraege={s.bewertungen} />

      <Kachel titel={t('Sterne im Vergleich')} klasse="mt-4" innen="p-4">
        {(() => {
          const pruef = s.bewertungen.filter((x) => istPruefstelle(x));
          const comm = s.bewertungen.filter((x) => !istPruefstelle(x));
          const reihen = [
            pruef.length && { name: t('Prüfstelle'), werte: kriterienMittel(pruef), farbe: '#ffc857', flaeche: true },
            comm.length && { name: t('Community'), werte: kriterienMittel(comm), farbe: '#f0344f', flaeche: true },
          ].filter(Boolean) as Reihe[];
          const achsen = KRITERIEN.map((k) => kriteriumLabel(ANKER[k].label));
          return (
            <>
              <NotenBalken achsen={achsen} reihen={reihen} />
              <details class="mt-4">
                <summary class="min-h-[44px] cursor-pointer py-2.5 text-sm text-gold-300">{t('Netzdiagramm anzeigen')}</summary>
                <Netzdiagramm titel={t('Netzdiagramm der sieben Kriterien')} achsen={achsen} reihen={reihen} />
              </details>
            </>
          );
        })()}
      </Kachel>

      <h2 class="etikett mt-6 !text-[11px]">{t('Alle Bewertungen')} · {s.bewertungen.length}</h2>
      <ul class="mt-2 grid gap-2 md:grid-cols-2">
        {s.bewertungen.map((e) => {
          const w = bewerte(e.noten, gewichte);
          const pruef = istPruefstelle(e);
          return (
            <li class="rounded-2xl border border-rand bg-flaeche px-3.5 py-3">
              <a href={`#/becher/${encodeURIComponent(e.id)}`} class="flex items-center gap-3 text-eis no-underline">
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2 font-semibold">
                    <span class="truncate">{pruef && !e.name ? 'David & Philip' : anzeigeName(e)}</span>
                    {pruef && <span class="shrink-0 whitespace-nowrap rounded-md border border-gold-400/70 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-gold-300">{t('Prüfstelle')}</span>}
                  </span>
                  <span class="block truncate text-xs text-dunst">
                    {[datumKurz(e.datum) ?? t('Saison {s}', { s: e.saison }), e.preis !== undefined ? euro(e.preis) : null].filter(Boolean).join(' · ')}
                  </span>
                  {e.notiz && <span class="mt-1 block text-sm text-eis/90">„{e.notiz}"</span>}
                </span>
                <span class="text-right">
                  <span class="block text-sm"><SterneZeile wert={w.gesamt} /></span>
                  <UrteilPill urteil={w.urteil} />
                </span>
              </a>
              {pruefstelle && HAT_SERVER && (e.sync === 'fertig' || e.sync === 'bestand') && (
                <button
                  type="button"
                  class="mt-2 text-xs text-wein-400 underline"
                  onClick={async () => {
                    if (!confirm(t('Diese Bewertung ausblenden?'))) return;
                    try {
                      await verstecke([e.id], true);
                      setHinweis(t('Bewertung ausgeblendet.'));
                    } catch (err) {
                      setHinweis(fehlerText(err));
                    }
                  }}
                >
                  {t('Ausblenden')}
                </button>
              )}
              {pruefstelle && (
                <button
                  type="button"
                  class="ml-3 mt-2 text-xs text-wein-400 underline"
                  onClick={async () => {
                    if (!confirm(t('Diese Bewertung endgültig löschen? Das lässt sich nicht rückgängig machen.'))) return;
                    try {
                      await entferne([e]);
                      setHinweis(t('Bewertung gelöscht.'));
                    } catch (err) {
                      setHinweis(fehlerText(err));
                    }
                  }}
                >
                  {t('Löschen')}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {pruefstelle && HAT_SERVER && <Pflege stand={s} alle={staende} meldung={setHinweis} />}
      {hinweis && (
        <p class="mt-3 text-sm text-gold-300" role="status">
          {hinweis}
        </p>
      )}
    </div>
  );
}

/** Nur für Prüfstellen-Geräte: umbenennen, Stadt und Markt zuordnen, Stände zusammenführen, ganz ausblenden. */
function Pflege({ stand: s, alle, meldung }: { stand: Stand<LokalerEintrag>; alle: Stand<LokalerEintrag>[]; meldung: (t: string) => void }) {
  const [name, setName] = useState(s.stand);
  const [stadt, setStadt] = useState(s.stadt ?? '');
  const [markt, setMarkt] = useState(s.markt);
  const [ziel, setZiel] = useState('');
  const ids = s.bewertungen.map((e) => e.id);

  const lauf = async (f: () => Promise<string>) => {
    meldung(t('Einen Moment …'));
    try {
      meldung(await f());
    } catch (err) {
      meldung(fehlerText(err));
    }
  };
  const kandidaten = alle.filter((x) => x.id !== s.id).sort((a, b) => Number(b.stadt === s.stadt) - Number(a.stadt === s.stadt) || a.stand.localeCompare(b.stand, 'de'));

  return (
    <section class="glas mt-6 rounded-3xl p-4">
      <h2 class="etikett !text-[11px] !text-gold-300">{t('Prüfstelle · Stand pflegen')}</h2>
      <div class="mt-3 grid gap-2 md:grid-cols-3">
        <label class="text-xs text-dunst">
          {t('Name')}
          <input class={FELD} value={name} maxLength={80} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        </label>
        <label class="text-xs text-dunst">
          {t('Stadt')}
          <input class={FELD} value={stadt} maxLength={60} onInput={(e) => setStadt((e.target as HTMLInputElement).value)} />
        </label>
        <label class="text-xs text-dunst">
          {t('Markt')}
          <input class={FELD} value={markt} maxLength={80} onInput={(e) => setMarkt((e.target as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class={KNOPF}
          onClick={() => lauf(async () => t('Gespeichert für {n} Bewertungen.', { n: await aendereStand(ids, name, markt, stadt) }))}
        >
          {t('Speichern')}
        </button>
      </div>

      <div class="mt-4 border-t border-rand pt-3">
        <p class="text-xs text-dunst">{t('Doppelt angelegt? Alle Bewertungen dieses Stands wandern zu dem gewählten Stand.')}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <select class={`${FELD} !w-auto min-w-[14rem]`} value={ziel} onChange={(e) => setZiel((e.target as HTMLSelectElement).value)} aria-label={t('Zusammenführen mit')}>
            <option value="">{t('Zusammenführen mit …')}</option>
            {kandidaten.map((k) => (
              <option value={k.id}>
                {k.stand} · {k.stadt ?? k.markt}
              </option>
            ))}
          </select>
          <button
            type="button"
            class={KNOPF}
            disabled={!ziel}
            onClick={() => {
              const z = alle.find((x) => x.id === ziel);
              if (!z || !confirm(t('„{a}" ({n} Bewertungen) in „{b}" zusammenführen?', { a: s.stand, n: s.bewertungen.length, b: z.stand }))) return;
              void lauf(async () => {
                await aendereStand(ids, z.stand, z.markt, z.stadt ?? '');
                location.hash = `#/stand/${encodeURIComponent(z.id)}`;
                return t('Zusammengeführt.');
              });
            }}
          >
            {t('Zusammenführen')}
          </button>
        </div>
      </div>

      <div class="mt-4 border-t border-rand pt-3">
        <button
          type="button"
          class="text-sm text-wein-400 underline"
          onClick={() => {
            if (!confirm(t('Den ganzen Stand „{a}" mit {n} Bewertungen ausblenden?', { a: s.stand, n: s.bewertungen.length }))) return;
            void lauf(async () => {
              await verstecke(ids, true);
              location.hash = '#/rangliste';
              return t('Stand ausgeblendet.');
            });
          }}
        >
          {t('Ganzen Stand ausblenden')}
        </button>
        <button
          type="button"
          class="ml-4 text-sm text-wein-400 underline"
          onClick={() => {
            if (!confirm(t('Den ganzen Stand „{a}\" mit {n} Bewertungen endgültig löschen? Das lässt sich nicht rückgängig machen.', { a: s.stand, n: s.bewertungen.length }))) return;
            void lauf(async () => {
              await entferne(s.bewertungen);
              location.hash = '#/rangliste';
              return t('Stand gelöscht.');
            });
          }}
        >
          {t('Ganzen Stand endgültig löschen')}
        </button>
      </div>
    </section>
  );
}
