// Startseite. Alle Zahlen kommen aus src/lib; hier wird nur angeordnet.
import { useState } from 'preact/hooks';
import { MARKE } from '../marke';
import { abendDatum } from '../lib/abend';
import { filtere, ranglisteMitWertung, saisons } from '../lib/auswertung';
import { euro, zahl2 } from '../lib/format';
import { preisindex } from '../lib/preisindex';
import { staedte, stadtVon } from '../lib/orte';
import { befunde } from '../lib/statistik';
import { abend, kennzahlen, neuesteBecher, saisonStatus, saisonVerlauf } from '../lib/startseite';
import { Betreiber, datumKurz, Notenbalken, SaisonSchalter, UrteilPill } from './bausteine';
import { leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { anzeigeName, pruefeName } from '../lib/community';
import { istIosImBrowser } from '../lib/installhinweis';
import { useEintraege, useGeraetId, useGewichte, useMeineAnzahl, useName, useSaison } from './daten';
import { useLive } from './hooks';
import { Deutschlandkarte } from './Deutschlandkarte';
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

export function Uebersicht() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const meineAnzahl = useMeineAnzahl();
  const [saison, setSaison] = useSaison(alle);
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
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{statusText}</p>
          <h1>{MARKE.name}</h1>
        </div>
        <SaisonSchalter saisons={jahre} wert={saison} onWahl={setSaison} />
      </div>

      {zeilen.length === 0 && !abendModus ? (
        <div class="karte leer">
          <b>In dieser Saison ist noch kein Becher bewertet.</b>
          Der erste Glühwein des Jahres wartet.
          <p style={{ margin: '14px 0 0' }}>
            <a class="pillknopf" href="#/erfassen">
              <Symbol name="plus" groesse={18} /> Ersten Becher erfassen
            </a>
          </p>
        </div>
      ) : (
        <div class="start-raster">
          {abendModus ? (
            <a class="karte spitze b-hero" href={heuteAbend.bester ? `#/becher/${heuteAbend.bester.id}` : '#/rangliste'}>
              <img class="siegel" src="./logo.svg" alt="" />
              <p class="eyebrow">
                Heute Abend{heuteAbend.markt ? ` · ${heuteAbend.markt}` : ''}
              </p>
              <div class="zahlen">
                <span class="zahl-gross">{heuteAbend.anzahl}</span>
                <span class="stand" style={{ fontSize: '20px', paddingBottom: '4px' }}>
                  {heuteAbend.anzahl === 1 ? 'Becher' : 'Becher'}
                </span>
              </div>
              <div class="geteilt" style={{ marginTop: '14px' }}>
                {heuteAbend.mittel !== null && <>Ø {zahl2(heuteAbend.mittel)}</>}
                {heuteAbend.bester && <> · bester: {heuteAbend.bester.stand}</>}
              </div>
            </a>
          ) : (
            <a class="karte spitze b-hero" href={`#/becher/${spitze[0].eintrag.id}`}>
              <img class="siegel" src="./logo.svg" alt="" />
              <p class="eyebrow">Spitzenreiter</p>
              <div class="stand">{spitze.map((z) => z.eintrag.stand).join(' & ')}</div>
              <div class="geteilt">
                {spitze.length > 1 ? 'Teilen sich Platz 1 · ' : ''}
                {[...new Set(spitze.map((z) => [z.eintrag.markt, stadtVon(MARKTLISTE, z.eintrag)].filter(Boolean).join(' · ')))].join(', ')}
              </div>
              <div class="zahlen">
                <span class="zahl-gross">{zahl2(spitze[0].wertung.gesamt)}</span>
                <span class="teil">
                  Glühwein <b>{zahl2(spitze[0].wertung.gluehwein)}</b>
                  <br />
                  Drumherum <b>{zahl2(spitze[0].wertung.drumherum)}</b>
                </span>
                <UrteilPill urteil={spitze[0].wertung.urteil} />
              </div>
            </a>
          )}

          <div class="b-plus">
            {meineAnzahl > 0 && <InstallHinweis />}
            {meineAnzahl > 0 && <NameKarte />}
            <a class="plus-balken" href="#/erfassen">
              <Symbol name="plus" groesse={22} />
              {heuteAbend.anzahl === 0 ? 'Becher erfassen' : 'Nächster Becher'}
              <span class="mono">Nr. {naechsteNr}</span>
            </a>
            {letzter && (
              <p class="plus-hinweis" style={{ color: 'var(--text-2)' }}>
                Zusammen an einer Bude?{' '}
                <a href={`#/teilen?e=${encodeURIComponent(letzter.id)}`}>QR-Code für {letzter.stand} zeigen</a>
              </p>
            )}
          </div>

          <div class="kennzahlen b-kpi">
            <div class="karte kpi">
              <div class="wert">{k.becher}</div>
              <div class="label">Becher</div>
            </div>
            <div class="karte kpi">
              <div class="wert">{k.maerkte}</div>
              <div class="label">Märkte</div>
            </div>
            <div class="karte kpi">
              <div class="wert">{k.staedte}</div>
              <div class="label">{k.staedte === 1 ? 'Stadt' : 'Städte'}</div>
            </div>
            <div class="karte kpi">
              <div class="wert">{zahl2(k.mittel)}</div>
              <div class="label">Ø Note</div>
            </div>
          </div>

          <section class="karte b-rang">
            <h2>
              Rangliste {saison === 'alle' ? '' : saison} <a href="#/rangliste">Alle {zeilen.length}</a>
            </h2>
            <ol class="topliste">
              {zeilen.slice(0, 5).map((z) => (
                <li>
                  <a href={`#/becher/${z.eintrag.id}`}>
                    <span class="rang">{z.rang ?? '–'}</span>
                    <span class="name">{z.eintrag.stand}</span>
                    <span class="note">{zahl2(z.wertung.gesamt)}</span>
                    <Notenbalken wert={z.wertung.gesamt} />
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <section class="karte b-karte">
            <h2>
              Wo ihr wart <a href="#/vergleich">Märkte</a>
            </h2>
            <Deutschlandkarte staedte={orte} />
          </section>

          <section class="karte b-preis">
            <h2>Glühwein-Preise</h2>
            {preise.zeilen.length === 0 ? (
              <p class="leer-hinweis">
                {preise.meldungen === 0
                  ? 'Noch keine Preise gemeldet. Trag bei der Erfassung den Preis ein, dann entsteht hier der Preisindex.'
                  : `${preise.meldungen} von ${preise.schwelle} nötigen Preismeldungen. Eine Stadt erscheint hier ab ${preise.schwelle} Meldungen.`}
              </p>
            ) : (
              <>
                <ul class="preisliste">
                  {preise.zeilen.slice(0, 6).map((p) => (
                    <li title={`${p.stadt}: Median ${euro(p.median)}, Mittel ${euro(p.mittel)}, ${euro(p.min)} bis ${euro(p.max)}, ${p.n} Meldungen`}>
                      <span class="name">{p.stadt}</span>
                      <span class="spanne">
                        {euro(p.min)} – {euro(p.max)} · {p.n}×
                      </span>
                      <span class="preis">{euro(p.median)}</span>
                    </li>
                  ))}
                </ul>
                <p class="leer-hinweis" style={{ marginTop: '10px' }}>
                  Median je Tasse, nach Meldungen der Bewertenden vor Ort. Alkoholfreies zählt nicht.
                </p>
              </>
            )}
          </section>

          <section class="karte b-neu">
            <h2>Neueste Becher</h2>
            <ul class="neueste">
              {neueste.map((e) => {
                const z = zeilen.find((x) => x.eintrag.id === e.id)!;
                return (
                  <li>
                    <a href={`#/becher/${e.id}`}>
                      <span class="n">
                        {e.stand}
                        <small>
                          {datumKurz(e.datum) ?? `Saison ${e.saison}`}
                          {e.becherNr !== undefined ? ` · Nr. ${e.becherNr}` : ''}
                          {e.name || e.pruefstelle ? ` · ${e.pruefstelle ? 'Prüfstelle' : anzeigeName(e)}` : ''}
                          {e.sync === 'offen' ? ' · nur auf diesem Gerät' : ''}
                        </small>
                      </span>
                      <span class="zahl">{zahl2(z.wertung.gesamt)}</span>
                      <UrteilPill urteil={z.wertung.urteil} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          {verlauf && (
            <section class="karte b-verlauf">
              <h2>Saisonverlauf · Becher je Abend</h2>
              <Saisonverlauf verlauf={verlauf} saison={saison as number} />
            </section>
          )}

          <section class="karte b-selbst">
            <h2>
              Selbstkontrolle <a href="#/statistik">Statistik</a>
            </h2>
            <ul class="befunde">
              <li class={`befund s-${wichtig.schwere}`}>
                <span class="marke">{wichtig.schwere === 'warnung' ? 'Achtung' : wichtig.schwere === 'gut' ? 'OK' : 'Hinweis'}</span>
                {wichtig.text}
              </li>
            </ul>
          </section>
        </div>
      )}
      <Betreiber />
    </>
  );
}
