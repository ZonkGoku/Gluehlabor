// Startseite. Alle Zahlen kommen aus src/lib; hier wird nur angeordnet.
import { useState } from 'preact/hooks';
import { abendDatum } from '../lib/abend';
import { filtere, ranglisteMitWertung, saisons } from '../lib/auswertung';
import { euro, zahl2 } from '../lib/format';
import { preisindex } from '../lib/preisindex';
import { staedte, stadtVon } from '../lib/orte';
import { befunde } from '../lib/statistik';
import { abend, kennzahlen, neuesteBecher, saisonStatus, saisonVerlauf } from '../lib/startseite';
import { Betreiber, datumKurz, UrteilPill } from './bausteine';
import { leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { anzeigeName, istPruefstelle, pruefeName } from '../lib/community';
import { istIosImBrowser } from '../lib/installhinweis';
import { useEintraege, useGeraetId, useGewichte, useMeineAnzahl, useName, useSaison } from './daten';
import { useLive } from './hooks';
import { Deutschlandkarte } from './Deutschlandkarte';
import { useEinblenden, useNeigung } from './nacht/bewegung';
import { Chips } from './nacht/Chips';
import { Kachel, Kennzahl } from './nacht/Kachel';
import { RangZeile } from './nacht/RangZeile';
import { kurzId, TicketRahmen, TopKarte } from './nacht/Ticket';
import { Saisonverlauf } from './Saisonverlauf';
import { LABELS, MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';

/** Einmalige, freiwillige Frage nach dem Namen, sobald von diesem Gerät etwas erfasst wurde. */
function NameKarte() {
  const name = useName();
  const abgelehnt = useLive(() => leseEinstellung<boolean>('nameAbgelehnt', false), [], false);
  const [wert, setWert] = useState('');
  const [fehler, setFehler] = useState('');
  if (name || abgelehnt) return null;
  const speichern = async () => {
    const p = pruefeName(wert);
    if (!p.ok) return setFehler(p.grund);
    if (p.name === null) return schreibeEinstellung('nameAbgelehnt', true);
    await setzeName(p.name);
    void synchronisiere();
  };
  return (
    <div class="name-karte">
      <label for="name-start">Wie sollen wir dich nennen? Freiwillig.</label>
      <div class="name-zeile">
        <input
          id="name-start"
          class="feld"
          type="text"
          maxLength={24}
          autocomplete="nickname"
          placeholder="Name oder Spitzname"
          value={wert}
          onInput={(e) => {
            setWert((e.target as HTMLInputElement).value);
            setFehler('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && void speichern()}
        />
        <button type="button" class="pillknopf" onClick={() => void speichern()}>
          Speichern
        </button>
        <button type="button" class="pillknopf" onClick={() => void schreibeEinstellung('nameAbgelehnt', true)}>
          Anonym bleiben
        </button>
      </div>
      <p class="name-hinweis">
        Der Name steht öffentlich neben deinen Bewertungen, auch bei denen, die du schon abgegeben hast. Besser kein voller echter Name.
        {fehler && <span class="name-fehler"> {fehler}</span>}
      </p>
    </div>
  );
}

/** Nur iPhone und iPad im Browser: Safari löscht lokale Daten nach 7 Tagen Pause, installierte Apps nicht. */
function InstallHinweis() {
  const zu = useLive(() => leseEinstellung<boolean>('installHinweisZu', false), [], false);
  const ios = istIosImBrowser(navigator.userAgent, navigator.maxTouchPoints, (navigator as { standalone?: boolean }).standalone);
  if (zu || !ios) return null;
  return (
    <div class="name-karte">
      <label>Tipp fürs iPhone: auf den Home-Bildschirm legen</label>
      <p class="name-hinweis" style={{ marginTop: 0 }}>
        Tippe unten auf das Teilen-Symbol und dann auf „Zum Home-Bildschirm". Sonst kann Safari nach einer Woche ohne Nutzung
        deinen Namen und nicht gesendete Bewertungen vergessen.
      </p>
      <div class="name-zeile">
        <button type="button" class="pillknopf" onClick={() => void schreibeEinstellung('installHinweisZu', true)}>
          Verstanden
        </button>
      </div>
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
            <span class="etikett !text-gold-300">Heute Abend</span>
            <span class="-rotate-3 rounded-md border border-gold-400/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
              {a.markt ?? 'Dein Abend'}
            </span>
          </div>
          <div class="mt-3 flex items-end gap-3">
            <span class="font-display text-[120px] leading-[0.86] licht-text drop-shadow-[0_0_26px_rgb(255_138_61/0.55)]">{a.anzahl}</span>
            <span class="pb-2 font-display text-3xl uppercase tracking-wide text-eis">{a.anzahl === 1 ? 'Becher' : 'Becher'}</span>
          </div>
          <p class="mt-3 text-sm text-dunst">
            {a.mittel !== null && <>Ø {zahl2(a.mittel)}</>}
            {a.bester && <> · bester: {a.bester.stand}</>}
          </p>
        </a>
      }
      stummel={
        <>
          <span class="font-display text-[34px] leading-none text-gold-300">{String(naechsteNr).padStart(2, '0')}</span>
          <div class="min-w-0 flex-1 leading-tight">
            <div class="etikett !text-[9.5px]">Nächster Becher</div>
            <div class="truncate text-xs text-dunst">Ticket #{kurzId(String(a.anzahl) + (a.markt ?? ''))}</div>
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
        <span class="block font-display text-[30px] uppercase tracking-wide">{erster ? 'Becher erfassen' : 'Nächster Becher'}</span>
        <span class="mt-1 block text-sm font-medium opacity-75">Bewerten, teilen, in die Rangliste</span>
      </span>
      <span class="rounded-full bg-[#1a1020]/85 px-3 py-1.5 font-mono text-sm text-[#ffd98a]">Nr. {nr}</span>
    </a>
  );
}

export function Uebersicht() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const meineAnzahl = useMeineAnzahl();
  const [saison, setSaison] = useSaison(alle);
  const raster = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jetzt = new Date();
  const heute = abendDatum(jetzt);
  const jahr = jetzt.getFullYear();
  const jahre = [...new Set([...saisons(alle), jahr])].sort();
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  const zeilen = ranglisteMitWertung(auswahl, gewichte);
  const spitze = zeilen.filter((z) => z.rang === 1);
  const k = kennzahlen(auswahl, MARKTLISTE, gewichte);
  const orte = staedte(MARKTLISTE, auswahl);
  const preise = preisindex(auswahl, MARKTLISTE);

  // Abend-Modus: nur die eigenen Becher dieses Geräts zählen, nicht die der Community.
  const meine = alle.filter((e) => e.geraet === geraetId);
  const heuteAbend = abend(meine, heute, gewichte);
  const abendModus = heuteAbend.anzahl > 0;
  const letzter = neuesteBecher(
    meine.filter((e) => e.datum === heute && e.besuchId),
    1,
  )[0];
  const naechsteNr = heuteAbend.anzahl === 0 ? 1 : heuteAbend.naechsteNr;
  const ortVon = (z: (typeof zeilen)[number]) => [z.eintrag.markt, stadtVon(MARKTLISTE, z.eintrag)].filter(Boolean).join(' · ');

  const status = saisonStatus(alle, typeof saison === 'number' ? saison : jahr, heute);
  const statusText =
    saison === 'alle'
      ? `Alle Saisons · ${alle.length} Becher`
      : status.tag !== null
        ? `Saison ${saison} · Tag ${status.tag}`
        : `Saison ${saison} · ${status.becher} Becher`;

  const verlauf = typeof saison === 'number' ? saisonVerlauf(alle, saison, gewichte, heute) : null;
  const neueste = neuesteBecher(auswahl, 5);
  const befund = befunde(auswahl, gewichte, LABELS);
  const wichtig = befund.find((b) => b.schwere === 'warnung') ?? befund[0];

  return (
    <div class="nm">
      <div class="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="etikett !text-gold-300">{statusText}</p>
          <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">Wer glüht am besten?</h1>
        </div>
        <Chips optionen={['alle', ...jahre] as const} wert={saison} onWahl={setSaison} beschriftung="Saison" label={(o) => (o === 'alle' ? 'Alle' : String(o))} />
      </div>

      {zeilen.length === 0 && !abendModus ? (
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">Noch kein Becher in dieser Saison</p>
          <p class="mt-2 text-dunst">Der erste Glühwein des Jahres wartet.</p>
          <a
            href="#/erfassen"
            class="animate-puls mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-[#1a1020] no-underline"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            <Symbol name="plus" groesse={18} /> Ersten Becher erfassen
          </a>
        </div>
      ) : (
        <div ref={raster} class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(meineAnzahl > 0 && <div data-ein class="col-span-2 md:col-span-4"><InstallHinweis /><NameKarte /></div>) || null}

          <div data-ein class="col-span-2 md:row-span-3">
            {abendModus ? (
              <AbendKarte abend={heuteAbend} naechsteNr={naechsteNr} />
            ) : (
              <TopKarte
                zeile={spitze[0]}
                titel={spitze.map((z) => z.eintrag.stand).join(' & ')}
                hinweis={spitze.length > 1 ? 'Teilen sich Platz 1' : undefined}
                ort={[...new Set(spitze.map(ortVon))].join(', ')}
              />
            )}
          </div>

          <ErfassenKnopf nr={naechsteNr} erster={heuteAbend.anzahl === 0} klasse="col-span-2" />
          <Kennzahl wert={k.becher} label="Becher" />
          <Kennzahl wert={k.maerkte} label="Märkte" />
          <Kennzahl wert={k.staedte} label={k.staedte === 1 ? 'Stadt' : 'Städte'} />
          <Kennzahl wert={zahl2(k.mittel)} label="Ø Note" />

          {letzter && (
            <p data-ein class="col-span-2 md:col-span-4 text-center text-sm text-dunst">
              Zusammen an einer Bude?{' '}
              <a class="font-medium text-gold-300 no-underline hover:text-gold-400" href={`#/teilen?e=${encodeURIComponent(letzter.id)}`}>
                QR-Code für {letzter.stand} zeigen
              </a>
            </p>
          )}

          <Kachel titel={`Rangliste ${saison === 'alle' ? '' : saison}`} link={{ href: '#/rangliste', text: `Alle ${zeilen.length}` }} klasse="col-span-2" innen="p-3">
            <ol class="space-y-2">
              {zeilen.slice(0, 5).map((z) => (
                <li>
                  <RangZeile zeile={z} ort={ortVon(z)} />
                </li>
              ))}
            </ol>
          </Kachel>

          <Kachel titel="Neueste Becher" klasse="col-span-2" innen="p-3">
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
                          {datumKurz(e.datum) ?? `Saison ${e.saison}`}
                          {e.becherNr !== undefined ? ` · Nr. ${e.becherNr}` : ''}
                          {e.name || istPruefstelle(e) ? ` · ${istPruefstelle(e) ? 'Prüfstelle' : anzeigeName(e)}` : ''}
                          {e.sync === 'offen' ? ' · nur auf diesem Gerät' : ''}
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

          <Kachel titel="Wo ihr wart" link={{ href: '#/vergleich', text: 'Märkte' }} klasse="col-span-2">
            <Deutschlandkarte staedte={orte} />
          </Kachel>

          <Kachel titel="Glühwein-Preise" klasse="col-span-2">
            {preise.zeilen.length === 0 ? (
              <p class="text-sm text-dunst">
                {preise.meldungen === 0
                  ? 'Noch keine Preise gemeldet. Trag bei der Erfassung den Preis ein, dann entsteht hier der Preisindex.'
                  : `${preise.meldungen} von ${preise.schwelle} nötigen Preismeldungen. Eine Stadt erscheint hier ab ${preise.schwelle} Meldungen.`}
              </p>
            ) : (
              <>
                <ul class="space-y-2">
                  {preise.zeilen.slice(0, 6).map((p) => (
                    <li
                      class="flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-2.5"
                      title={`${p.stadt}: Median ${euro(p.median)}, Mittel ${euro(p.mittel)}, ${euro(p.min)} bis ${euro(p.max)}, ${p.n} Meldungen`}
                    >
                      <span class="flex-1 font-semibold">{p.stadt}</span>
                      <span class="font-mono text-xs text-dunst">
                        {euro(p.min)} – {euro(p.max)} · {p.n}×
                      </span>
                      <span class="font-display text-2xl leading-none text-gold-300">{euro(p.median)}</span>
                    </li>
                  ))}
                </ul>
                <p class="mt-3 text-xs text-dunst">Median je Tasse, nach Meldungen der Bewertenden vor Ort. Alkoholfreies zählt nicht.</p>
              </>
            )}
          </Kachel>

          {verlauf && (
            <Kachel titel="Saisonverlauf · Becher je Abend" klasse="col-span-2 md:col-span-4">
              <Saisonverlauf verlauf={verlauf} saison={saison as number} />
            </Kachel>
          )}

          <Kachel titel="Selbstkontrolle" link={{ href: '#/statistik', text: 'Statistik' }} klasse="col-span-2 md:col-span-4">
            <p class="text-sm leading-relaxed text-eis">
              <span class="mr-2 rounded-md border border-gold-400/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold-300">
                {wichtig.schwere === 'warnung' ? 'Achtung' : wichtig.schwere === 'gut' ? 'OK' : 'Hinweis'}
              </span>
              {wichtig.text}
            </p>
          </Kachel>
        </div>
      )}
      <Betreiber />
    </div>
  );
}
