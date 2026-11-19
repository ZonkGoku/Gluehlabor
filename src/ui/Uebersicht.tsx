// Startseite. Alle Zahlen kommen aus src/lib; hier wird nur angeordnet.
import { useState } from 'preact/hooks';
import { abendDatum } from '../lib/abend';
import { filtere, ranglisteMitWertung, saisons } from '../lib/auswertung';
import { euro, zahl2 } from '../lib/format';
import { preisindex } from '../lib/preisindex';
import { ortText, staedte } from '../lib/orte';
import { abend, kennzahlen, neuesteBecher, saisonStatus, saisonVerlauf } from '../lib/startseite';
import { Betreiber, datumKurz, UrteilPill } from './bausteine';
import { setzeName } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { anzeigeName, istPruefstelle, pruefeName } from '../lib/community';
import { InstallKarte } from './InstallKarte';
import { useEintraege, useGeraetId, useGewichte, useMeineAnzahl, useName, useSaison } from './daten';
import { Deutschlandkarte } from './Deutschlandkarte';
import { leseZuletzt } from '../daten/zuletzt';
import { useEinblenden, useNeigung } from './nacht/bewegung';
import { Chips } from './nacht/Chips';
import { Kachel, Kennzahl } from './nacht/Kachel';
import { DealZeile, StandTopKarte, StandZeile } from './nacht/StandKarten';
import { baueStaende, standAlsZeile } from '../lib/staende';
import { kurzId, TicketRahmen } from './nacht/Ticket';
import { Saisonverlauf } from './Saisonverlauf';
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
      <label for="name-start">{t('Wie sollen wir dich nennen? Ohne Namen kann niemand deine Bewertungen sehen.')}</label>
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
        {t('Der Name steht öffentlich neben deinen Bewertungen, auch bei denen, die du schon abgegeben hast. Besser kein voller echter Name.')}
        {fehler && <span class="name-fehler"> {t(fehler)}</span>}
      </p>
    </div>
  );
}

/** Hero am Abend: dein Abend als Ticket, solange von diesem Gerät heute etwas erfasst wurde. */
function AbendKarte({ abend: a, naechsteNr, klasse }: { abend: ReturnType<typeof abend>; naechsteNr: number; klasse?: string }) {
  return (
    <TicketRahmen
      rang={1}
      klasse={klasse}
      kinder={
        <a href={a.bester ? `#/becher/${encodeURIComponent(a.bester.id)}` : '#/rangliste'} class="block p-5 pb-4 text-eis no-underline">
          <div class="flex items-center justify-between">
            <span class="etikett !text-gold-300">{t('Heute Abend')}</span>
            <span class="-rotate-3 rounded-md border border-gold-400/70 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-300">
              {a.markt ?? t('Dein Abend')}
            </span>
          </div>
          <div class="mt-3 flex items-end gap-3">
            <span class="font-display text-[120px] leading-[0.86] licht-text drop-shadow-[0_0_26px_rgb(255_138_61/0.55)]">{a.anzahl}</span>
            <span class="pb-2 font-display text-3xl uppercase tracking-wide text-eis">{a.anzahl === 1 ? t('Becher') : t('Becher')}</span>
          </div>
          <p class="mt-3 text-sm text-dunst">
            {a.mittel !== null && <>Ø {zahl2(a.mittel)}</>}
            {a.bester && <> · {t('bester: {stand}', { stand: a.bester.stand })}</>}
          </p>
        </a>
      }
      stummel={
        <>
          <span class="font-display text-[34px] leading-none text-gold-300">{String(naechsteNr).padStart(2, '0')}</span>
          <div class="min-w-0 flex-1 leading-tight">
            <div class="etikett !text-[11px]">{t('Nächster Becher')}</div>
            <div class="truncate text-xs text-dunst">{t('Ticket')} #{kurzId(String(a.anzahl) + (a.markt ?? ''))}</div>
          </div>
        </>
      }
    />
  );
}

/** Der große Knopf: leuchtet leise, federt beim Antippen. */
function ErfassenKnopf({ nr, erster, klasse }: { nr: number; erster: boolean; klasse?: string }) {
  const ref = useNeigung<HTMLAnchorElement>(3);
  return (
    <a
      ref={ref}
      data-ein
      href="#/erfassen"
      class={`animate-puls flex items-center gap-4 rounded-3xl p-4 text-[#1a1020] no-underline ${klasse ?? ''}`}
      style={{ background: 'linear-gradient(135deg,#ffe29a 0%,#ff8a3d 55%,#f0344f 115%)' }}
    >
      <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#1a1020]/85 text-[#ffd98a]">
        <Symbol name="flamme" groesse={26} />
      </span>
      <span class="flex-1 leading-none">
        <span class="block font-display text-[30px] uppercase tracking-wide">{erster ? t('Bewerten') : t('Nächsten Glühwein bewerten')}</span>
        <span class="mt-1 block text-sm font-medium opacity-75">{t('Bewerten, teilen, in die Rangliste')}</span>
      </span>
      {!erster && <span class="rounded-full bg-[#1a1020]/85 px-3 py-1.5 font-mono text-sm text-[#ffd98a]">{t('{n}. heute', { n: nr })}</span>}
    </a>
  );
}

const AUSWAHL =
  'glas appearance-none rounded-full py-2.5 pl-4 pr-9 text-sm text-eis outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400/70 min-h-[44px]';

/** Erste Begegnung: in einem Satz sagen, was die App ist und was man tun soll. */
function Willkommen() {
  const schritte = ['Glühweinstand wählen', 'Noten und Preis eintragen', 'Rangliste ansehen und teilen'];
  return (
    <section data-ein class="glas rahmen-licht mb-1 mt-2 rounded-3xl p-5">
      <p class="etikett !text-gold-300">{t('Glühwein-Rangliste für Weihnachtsmärkte')}</p>
      <h1 class="mt-2 font-display text-[38px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Wo gibt’s den besten Glühwein?')}</h1>
      <p class="mt-3 text-base text-eis/90">{t('Bewerte deinen Glühwein in 30 Sekunden. Aus allen Bewertungen entsteht die Rangliste. Ohne Konto.')}</p>
      <ol class="mt-4 grid gap-2 text-sm text-dunst">
        {schritte.map((x, i) => (
          <li class="flex items-center gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full border border-gold-400/60 font-mono text-xs text-gold-300">{i + 1}</span>
            {t(x)}
          </li>
        ))}
      </ol>
      <div class="mt-5 grid gap-2.5 sm:grid-cols-2">
        <a
          href="#/erfassen"
          class="animate-puls flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 font-semibold text-[#1a1020] no-underline"
          style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
        >
          <Symbol name="plus" groesse={18} /> {t('Jetzt bewerten')}
        </a>
        <a href="#/rangliste" class="glas flex min-h-[52px] items-center justify-center rounded-full px-6 font-semibold text-eis no-underline">
          {t('Rangliste ansehen')}
        </a>
      </div>
      <p class="mt-3 text-xs text-dunst">{t('Glühwein nur ab 18 Jahren. Trink verantwortungsvoll.')}</p>
    </section>
  );
}

export function Uebersicht() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const meineAnzahl = useMeineAnzahl();
  const [saison, setSaison] = useSaison(alle);
  const [stadtWahl, setStadtWahl] = useState<string>(() => {
    try {
      return localStorage.getItem('gluehlabor.startstadt') ?? leseZuletzt()[0]?.stadt ?? 'alle';
    } catch {
      return 'alle';
    }
  });
  const raster = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jetzt = new Date();
  const heute = abendDatum(jetzt);
  const jahr = jetzt.getFullYear();
  const jahre = [...new Set([...saisons(alle), jahr])].sort();
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  const zeilen = ranglisteMitWertung(auswahl, gewichte);
  const staende = baueStaende(auswahl, MARKTLISTE, gewichte);
  // Rangliste der gewählten Stadt (die Stadt muss es in dieser Auswahl geben, sonst gilt ganz Deutschland)
  const stadtListe = staedte(MARKTLISTE, auswahl).filter((x): x is typeof x & { stadt: string } => x.stadt !== null);
  const stadt = stadtListe.some((x) => x.stadt === stadtWahl) ? stadtWahl : 'alle';
  const staendeStadt = stadt === 'alle' ? staende : baueStaende(filtere(auswahl, { saison: 'alle', markt: 'alle', stadt }, MARKTLISTE), MARKTLISTE, gewichte);
  const waehleStadt = (neu: string) => {
    setStadtWahl(neu);
    try {
      localStorage.setItem('gluehlabor.startstadt', neu);
    } catch {
      /* egal */
    }
  };
  const spitze = staendeStadt.filter((s) => s.rang === 1);
  const k = kennzahlen(auswahl, MARKTLISTE, gewichte);
  const orte = staedte(MARKTLISTE, auswahl);
  const preise = preisindex(auswahl, MARKTLISTE);
  const topDeals = staende.filter((s) => s.deal.punkte !== null).sort((a, b) => (a.deal.rang ?? 1e9) - (b.deal.rang ?? 1e9)).slice(0, 3);

  // Abend-Modus: nur die eigenen Becher dieses Geräts zählen, nicht die der Community.
  const meine = alle.filter((e) => e.geraet === geraetId);
  const heuteAbend = abend(meine, heute, gewichte);
  const abendModus = heuteAbend.anzahl > 0;
  const letzter = neuesteBecher(
    meine.filter((e) => e.datum === heute && e.besuchId),
    1,
  )[0];
  const naechsteNr = heuteAbend.anzahl === 0 ? 1 : heuteAbend.naechsteNr;

  const status = saisonStatus(alle, typeof saison === 'number' ? saison : jahr, heute);
  const statusText =
    saison === 'alle'
      ? t('Alle Saisons · {n} Becher', { n: alle.length })
      : status.tag !== null
        ? t('Saison {s} · Tag {tag}', { s: saison, tag: status.tag })
        : t('Saison {s} · {n} Becher', { s: saison, n: status.becher });

  const verlauf = typeof saison === 'number' ? saisonVerlauf(alle, saison, gewichte, heute) : null;
  const neueste = neuesteBecher(auswahl, 5);

  return (
    <div class="nm">
      {meineAnzahl === 0 ? (
        <Willkommen />
      ) : (
        <div class="mb-5 mt-2">
          <p class="etikett !text-gold-300">{statusText}</p>
          <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Wer glüht am besten?')}</h1>
        </div>
      )}
      <div class="mb-4 empty:hidden">
        <InstallKarte />
      </div>

      <div class="mb-4 mt-5 flex flex-wrap items-center gap-2.5">
        <label class="relative">
          <span class="sr-only">{t('Stadt')}</span>
          <select class={AUSWAHL} value={stadt} onChange={(ev) => waehleStadt((ev.target as HTMLSelectElement).value)}>
            <option value="alle">{t('Die Besten in ganz Deutschland')}</option>
            {stadtListe.map((x) => (
              <option value={x.stadt}>{t('Die Besten in {stadt}', { stadt: x.stadt })}</option>
            ))}
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-dunst">
            <Symbol name="pfeil" groesse={14} />
          </span>
        </label>
        <Chips optionen={['alle', ...jahre] as const} wert={saison} onWahl={setSaison} beschriftung={t('Saison')} label={(o) => (o === 'alle' ? t('Alle') : String(o))} />
      </div>

      {zeilen.length === 0 && !abendModus ? (
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">{t('Noch kein Becher in dieser Saison')}</p>
          <p class="mt-2 text-dunst">{t('Der erste Glühwein des Jahres wartet.')}</p>
          <a
            href="#/erfassen"
            class="animate-puls mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-[#1a1020] no-underline"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            <Symbol name="plus" groesse={18} /> {t('Jetzt bewerten')}
          </a>
        </div>
      ) : (
        <div ref={raster} class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {meineAnzahl > 0 && (
            <div data-ein class="col-span-2 md:col-span-4">
              <NameKarte />
            </div>
          )}

          <div data-ein class="col-span-2 md:row-span-3">
            {abendModus ? (
              <AbendKarte abend={heuteAbend} naechsteNr={naechsteNr} />
            ) : spitze.length === 0 ? (
              <div class="glas rounded-3xl p-6 text-center">
                <p class="font-display text-2xl uppercase tracking-wide text-eis">{t('Noch keine Bewertung hier')}</p>
                <p class="mt-2 text-dunst">{t('Sei die oder der Erste in {stadt}.', { stadt: stadt === 'alle' ? t('deiner Stadt') : stadt })}</p>
              </div>
            ) : (
              <StandTopKarte
                stand={spitze[0]}
                titel={spitze[0].stand}
                hinweis={[stadt !== 'alle' ? t('Platz 1 in {stadt}', { stadt }) : null, spitze.length > 1 ? t('Gleichauf mit {n} weiteren', { n: spitze.length - 1 }) : null].filter(Boolean).join(' · ') || undefined}
                ort={ortText(MARKTLISTE, standAlsZeile(spitze[0]).eintrag)}
              />
            )}
          </div>

          <ErfassenKnopf nr={naechsteNr} erster={heuteAbend.anzahl === 0} klasse="col-span-2" />
          <Kennzahl wert={k.becher} label={t('Becher')} />
          <Kennzahl wert={k.maerkte} label={t('Märkte')} />
          <Kennzahl wert={k.staedte} label={k.staedte === 1 ? t('Stadt') : t('Städte')} />
          <Kennzahl wert={zahl2(k.mittel)} label={t('Ø Note')} />

          {letzter && (
            <p data-ein class="col-span-2 md:col-span-4 text-center text-sm text-dunst">
              {t('Zusammen an einer Bude?')}{' '}
              <a class="font-medium text-gold-300 no-underline hover:text-gold-400" href={`#/teilen?e=${encodeURIComponent(letzter.id)}`}>
                {t('QR-Code für {stand} zeigen', { stand: letzter.stand })}
              </a>
            </p>
          )}

          <Kachel titel={`${t('Rangliste')} ${saison === 'alle' ? '' : saison}`} link={{ href: '#/rangliste', text: t('Alle {n}', { n: staendeStadt.length }) }} klasse="col-span-2" innen="p-3">
            <ol class="space-y-2">
              {staendeStadt.slice(spitze.length > 0 ? 1 : 0, 6).map((s) => (
                <li>
                  <StandZeile stand={s} />
                </li>
              ))}
            </ol>
          </Kachel>

          <Kachel titel={t('Neueste Becher')} klasse="col-span-2" innen="p-3">
            <ul class="space-y-2">
              {neueste.map((e) => {
                const z = zeilen.find((x) => x.eintrag.id === e.id)!;
                return (
                  <li>
                    <a
                      href={`#/becher/${encodeURIComponent(e.id)}`}
                      class="flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-3 text-eis no-underline transition hover:border-[var(--nm-rand-stark)] hover:bg-flaeche-hover"
                    >
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold">{e.stand}</span>
                        <span class="block truncate text-xs text-dunst">
                          {datumKurz(e.datum) ?? t('Saison {s}', { s: e.saison })}
                          {e.becherNr !== undefined ? ` · ${t('Nr.')} ${e.becherNr}` : ''}
                          {e.name || istPruefstelle(e) ? ` · ${istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e)}` : ''}
                          {e.sync === 'offen' ? ` · ${t('nur auf diesem Gerät')}` : ''}
                        </span>
                      </span>
                      <span class="font-display text-[26px] leading-none text-gold-300">{zahl2(z.wertung.gesamt)}</span>
                      <UrteilPill urteil={z.wertung.urteil} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </Kachel>

          <Kachel titel={t('Wo ihr wart')} link={{ href: '#/vergleich', text: t('Märkte') }} klasse="col-span-2">
            <Deutschlandkarte staedte={orte} />
          </Kachel>

          <Kachel titel={t('Top Deals')} link={{ href: '#/rangliste?deals=1', text: t('Alle Deals') }} klasse="col-span-2" innen="p-3">
            {topDeals.length === 0 ? (
              <p class="px-1 py-2 text-sm text-dunst">{t('Sobald Preise gemeldet sind, erscheinen hier die besten Deals.')}</p>
            ) : (
              <ol class="space-y-2">
                {topDeals.map((s) => (
                  <li>
                    <DealZeile stand={s} />
                  </li>
                ))}
              </ol>
            )}
          </Kachel>

          <Kachel titel={t('Glühwein-Preise')} klasse="col-span-2 md:col-span-4">
            {preise.zeilen.length === 0 ? (
              <p class="text-sm text-dunst">
                {preise.meldungen === 0
                  ? t('Noch keine Preise gemeldet. Trag bei der Erfassung den Preis ein, dann entsteht hier der Preisindex.')
                  : t('{n} von {schwelle} nötigen Preismeldungen. Eine Stadt erscheint hier ab {schwelle} Meldungen.', { n: preise.meldungen, schwelle: preise.schwelle })}
              </p>
            ) : (
              <>
                <ul class="space-y-2">
                  {preise.zeilen.slice(0, 6).map((p) => (
                    <li
                      class="flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-2.5"
                      title={t('{stadt}: Median {median}, Mittel {mittel}, {min} bis {max}, {n} Meldungen', { stadt: p.stadt, median: euro(p.median), mittel: euro(p.mittel), min: euro(p.min), max: euro(p.max), n: p.n })}
                    >
                      <span class="flex-1 font-semibold">{p.stadt}</span>
                      <span class="font-mono text-xs text-dunst">
                        {euro(p.min)} – {euro(p.max)} · {p.n}×
                      </span>
                      <span class="font-display text-2xl leading-none text-gold-300">{euro(p.median)}</span>
                    </li>
                  ))}
                </ul>
                <p class="mt-3 text-xs text-dunst">{t('Median je Tasse, nach Meldungen der Bewertenden vor Ort. Alkoholfreies zählt nicht.')}</p>
              </>
            )}
          </Kachel>

          {verlauf && (
            <Kachel titel={t('Saisonverlauf · Becher je Abend')} klasse="col-span-2 md:col-span-4">
              <Saisonverlauf verlauf={verlauf} saison={saison as number} />
            </Kachel>
          )}
        </div>
      )}
      <Betreiber />
    </div>
  );
}
