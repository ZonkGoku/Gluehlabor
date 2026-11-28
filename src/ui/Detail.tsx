import { useEffect, useState } from 'preact/hooks';
import { ApiFehler } from '../daten/api';
import { HAT_SERVER } from '../daten/config';
import { leseEinstellung } from '../daten/db';
import { fotoAdresse, loescheFoto, macheFotoOeffentlich, macheFotoPrivat } from '../daten/fotos';
import { versteckeFoto } from '../daten/moderation';
import { useLive } from './hooks';
import { MELDEGRUENDE, meldeBecher } from '../daten/sync';
import { ankerFuer } from '../lib/anker';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { filtere } from '../lib/auswertung';
import { baueStaende } from '../lib/staende';
import { euro } from '../lib/format';
import { KRITERIEN } from '../lib/modell';
import { ortText, ortTeile } from '../lib/orte';
import { bewerte } from '../lib/scoring';
import { kriteriumStatistik } from '../lib/statistik';
import { datumKurz } from './bausteine';
import { Netzdiagramm } from './Netzdiagramm';
import { TopKarte } from './nacht/Ticket';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { ANKER, MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';
import { SterneZeile } from './nacht/SterneWert';
import { t, kriteriumLabel, aktuelleSprache } from '../i18n';

const SORTE: Record<string, string> = {
  rot: 'Rot',
  weiss: 'Weiß',
  kirsch: 'Kirsch',
  winzer: 'Winzer',
  feuerzangen: 'Feuerzangenbowle',
  alkoholfrei: 'Alkoholfrei',
  sonstiges: 'Sonstiges',
};

export function Detail({ id }: { id: string }) {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [meldenOffen, setMeldenOffen] = useState(false);
  const [grund, setGrund] = useState('spam');
  const [meldeText, setMeldeText] = useState('');
  const [meldung, setMeldung] = useState('');
  const e = alle?.find((x) => x.id === id);
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const [fotoMeldung, setFotoMeldung] = useState('');

  useEffect(() => {
    if (!e) return;
    if (e.fotoBlob) {
      const u = URL.createObjectURL(e.fotoBlob);
      setFotoUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setFotoUrl(fotoAdresse(e) ?? null); // Foto der Community vom Server
  }, [e?.id, e?.foto, e?.fotoBlob]);

  if (!alle) return null;
  if (!e)
    return (
      <div class="karte leer">
        <b>{t('Diesen Becher gibt es nicht.')}</b>
        <a href="#/rangliste">{t('Zur Rangliste')}</a>
      </div>
    );

  const w = bewerte(e.noten, gewichte);
  // Platz = Platz des Stands in der Rangliste (die Liste zählt Stände), nicht der Rang dieser einen Bewertung
  const staendeSaison = baueStaende(filtere(alle, { saison: e.saison, markt: 'alle' }), MARKTLISTE, gewichte);
  const rang = staendeSaison.find((s) => s.bewertungen.some((b) => b.id === e.id))?.rang ?? undefined;
  const meta = [
    ...ortTeile(MARKTLISTE, e),
    t('von {name}', { name: istPruefstelle(e) ? 'David & Philip' : anzeigeName(e) }),
    t('Saison {s}', { s: e.saison }),
    datumKurz(e.datum),
    e.sorte && t(SORTE[e.sorte]),
    e.becherNr !== undefined && t('{n}. Becher des Abends', { n: e.becherNr }),
    e.preis !== undefined && `${euro(e.preis)}${e.menge ? ` / ${String(e.menge).replace('.', aktuelleSprache() === 'en' ? '.' : ',')} l` : ''}`,
  ].filter(Boolean) as string[];

  return (
    <>
      <a class="zurueck" href="#/rangliste">
        <Symbol name="zurueck" groesse={18} /> {t('Rangliste')}
      </a>
      {fotoUrl && <img class="foto-hero" src={fotoUrl} alt={t('Foto vom Stand {stand}', { stand: e.stand })} />}
      <div class="detail-kopf">
        <TopKarte
          zeile={{ rang: rang ?? null, eintrag: e, wertung: w }}
          ort={ortText(MARKTLISTE, e)}
          hinweis={rang ? t('Stand: Platz {r} von {n}', { r: rang, n: staendeSaison.length }) : undefined}
          ohneLink
        />
        <section class="karte">
          <h2>{t('Protokoll')}</h2>
          <div class="metaliste">
            {istPruefstelle(e) && <span class="chip-klein gold">{t('Prüfstelle')}</span>}
            {meta.map((m) => (
              <span class="chip-klein">{m}</span>
            ))}
          </div>
          {e.notiz && <p style={{ margin: '14px 0 0', lineHeight: 1.5 }}>„{e.notiz}"</p>}
          {e.geraet === geraetId && e.fotoBlob && (
            <div class="grid gap-2" style={{ margin: '14px 0 0' }}>
              {e.fotoOeffentlich ? (
                <p class="m-0 text-sm text-dunst">
                  {e.fotoHochgeladen || e.foto ? t('Dein Foto ist für alle sichtbar.') : t('Dein Foto wird hochgeladen, sobald Netz da ist.')}
                </p>
              ) : (
                <p class="m-0 text-sm text-dunst">{e.fotoFehler ? `${t('Das Foto bleibt privat:')} ${t(e.fotoFehler)}` : t('Dein Foto ist nur auf diesem Gerät.')}</p>
              )}
              <p class="m-0 flex flex-wrap gap-2">
                {!e.fotoOeffentlich && HAT_SERVER && (
                  <button type="button" class="pillknopf" onClick={() => void macheFotoOeffentlich(e.id)}>
                    {t('Foto für alle sichtbar machen')}
                  </button>
                )}
                {e.fotoOeffentlich && (
                  <button
                    type="button"
                    class="pillknopf"
                    onClick={async () => {
                      try {
                        await macheFotoPrivat(e.id);
                        setFotoMeldung('');
                      } catch {
                        setFotoMeldung(t('Kein Netz. Bitte später erneut versuchen.'));
                      }
                    }}
                  >
                    {t('Foto wieder privat machen')}
                  </button>
                )}
                <button
                  type="button"
                  class="pillknopf"
                  onClick={async () => {
                    if (confirm(t('Das Foto löschen? Es verschwindet auch für alle anderen.'))) await loescheFoto(e.id);
                  }}
                >
                  {t('Foto löschen')}
                </button>
              </p>
              {fotoMeldung && <p class="m-0 text-sm text-[var(--warnung)]">{fotoMeldung}</p>}
            </div>
          )}
          {pruefstelle && e.foto && (
            <p style={{ margin: '14px 0 0' }}>
              <button
                type="button"
                class="pillknopf"
                onClick={async () => {
                  if (confirm(t('Dieses Foto für alle ausblenden?'))) {
                    try {
                      await versteckeFoto(e.id, true);
                    } catch {
                      setFotoMeldung(t('Kein Netz. Bitte später erneut versuchen.'));
                    }
                  }
                }}
              >
                {t('Foto ausblenden (Prüfstelle)')}
              </button>
            </p>
          )}
          {e.geraet === geraetId && e.sync !== 'bestand' && (
            <p style={{ margin: '14px 0 0' }}>
              <a class="pillknopf" href={`#/aendern/${encodeURIComponent(e.id)}`}>
                {t('Bewertung ändern')}
              </a>
            </p>
          )}
          {e.geraet === geraetId && e.besuchId && (
            <p style={{ margin: '14px 0 0' }}>
              <a class="pillknopf" href={`#/teilen?e=${encodeURIComponent(e.id)}`}>
                {t('QR zum Mitbewerten zeigen')}
              </a>
            </p>
          )}
          {HAT_SERVER && e.geraet !== geraetId && !istPruefstelle(e) && (
            <div style={{ marginTop: '14px' }}>
              {!meldenOffen ? (
                <button type="button" class="besuch-aus" style={{ padding: 0 }} onClick={() => setMeldenOffen(true)}>
                  {t('Diesen Eintrag melden')}
                </button>
              ) : (
                <div class="melde-form">
                  <label for="melde-grund">{t('Was stimmt nicht?')}</label>
                  <select id="melde-grund" class="auswahl" value={grund} onChange={(ev) => setGrund((ev.target as HTMLSelectElement).value)}>
                    {MELDEGRUENDE.map((g) => (
                      <option value={g.wert}>{t(g.label)}</option>
                    ))}
                  </select>
                  <input
                    class="feld"
                    style={{ height: '40px', fontSize: '15px' }}
                    type="text"
                    maxLength={300}
                    placeholder={t('Kurze Erklärung (freiwillig)')}
                    aria-label={t('Erklärung zur Meldung')}
                    value={meldeText}
                    onInput={(ev) => setMeldeText((ev.target as HTMLInputElement).value)}
                  />
                  <div class="knopfreihe" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      class="pillknopf"
                      onClick={async () => {
                        setMeldung(t('Sende …'));
                        try {
                          await meldeBecher(e.id, grund, meldeText);
                          setMeldung(t('Danke. Wir sehen uns den Eintrag an.'));
                          setMeldenOffen(false);
                        } catch (err) {
                          setMeldung(err instanceof ApiFehler ? t(err.message) : t('Kein Netz. Bitte später erneut versuchen.'));
                        }
                      }}
                    >
                      {t('Melden')}
                    </button>
                    <button type="button" class="pillknopf" onClick={() => setMeldenOffen(false)}>
                      {t('Abbrechen')}
                    </button>
                  </div>
                </div>
              )}
              {meldung && <p class="meldung" style={{ margin: '8px 0 0' }}>{meldung}</p>}
            </div>
          )}
          {e.sync === 'offen' && (
            <p style={{ color: 'var(--warnung)', fontSize: '13px', margin: '14px 0 0' }}>
              {t('Noch nicht gesendet.')}
            </p>
          )}
        </section>
      </div>

      <section class="karte" style={{ marginTop: '14px' }}>
        <h2>{t('Die sieben Kriterien')}</h2>
        <ul class="m-0 grid list-none gap-3 p-0">
          {KRITERIEN.map((k) => {
            const n = e.noten[k];
            const anker = n === null ? [] : ankerFuer(ANKER[k], n);
            return (
              <li>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[15px] font-semibold text-eis">{kriteriumLabel(ANKER[k].label)}</span>
                  {n === null ? <span class="text-sm text-dunst">{t('nicht bewertet')}</span> : <SterneZeile wert={n} />}
                </div>
                {n !== null && anker.length > 0 && <p class="mt-0.5 text-sm text-dunst">{anker.map((a) => a.text).join('  ·  ')}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section class="karte" style={{ marginTop: '14px' }}>
        <details>
          <summary style={{ cursor: 'pointer', minHeight: '44px', padding: '10px 0', fontWeight: 600 }}>{t('Netzdiagramm anzeigen')}</summary>
        <Netzdiagramm
          titel={t('Netzdiagramm der sieben Kriterien')}
          achsen={KRITERIEN.map((k) => kriteriumLabel(ANKER[k].label))}
          reihen={[
            { name: t('Diese Bewertung'), werte: KRITERIEN.map((k) => e.noten[k]), farbe: '#ff8a3d', flaeche: true },
            { name: t('Ø aller Becher'), werte: KRITERIEN.map((k) => kriteriumStatistik(alle, k).mittel), farbe: '#a3accb', gestrichelt: true },
          ]}
        />
        </details>
      </section>

    </>
  );
}
