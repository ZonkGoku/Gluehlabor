import { useEffect, useState } from 'preact/hooks';
import { ApiFehler } from '../daten/api';
import { HAT_SERVER } from '../daten/config';
import { MELDEGRUENDE, meldeBecher } from '../daten/sync';
import { ankerFuer } from '../lib/anker';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { filtere, ranglisteMitWertung } from '../lib/auswertung';
import { euro, zahl2 } from '../lib/format';
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

  useEffect(() => {
    if (!e) return;
    if (e.fotoBlob) {
      const u = URL.createObjectURL(e.fotoBlob);
      setFotoUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setFotoUrl(null);
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
  const saisonZeilen = ranglisteMitWertung(filtere(alle, { saison: e.saison, markt: 'alle' }), gewichte);
  const rang = saisonZeilen.find((z) => z.eintrag.id === e.id)?.rang;
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
      <div class="detail-kopf">
        <TopKarte
          zeile={{ rang: rang ?? null, eintrag: e, wertung: w }}
          ort={ortText(MARKTLISTE, e)}
          hinweis={rang ? t('Platz {r} von {n}', { r: rang, n: saisonZeilen.length }) : undefined}
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
          {fotoUrl && <img class="foto" src={fotoUrl} alt={t('Foto vom Stand {stand}', { stand: e.stand })} />}
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
              {t('Noch nur auf diesem Gerät. Wird synchronisiert, sobald Netz da ist.')}
            </p>
          )}
        </section>
      </div>

      <section class="karte" style={{ marginTop: '14px' }}>
        <h2>{t('Profil der sieben Noten')}</h2>
        <div class="profil">
          {KRITERIEN.map((k) => {
            const n = e.noten[k];
            const schnitt = kriteriumStatistik(alle, k).mittel;
            const anker = n === null ? [] : ankerFuer(ANKER[k], n);
            return (
              <div class="kriterium">
                <span class="krit">
                  {kriteriumLabel(ANKER[k].label)}
                  <small>×{gewichte[k]}</small>
                </span>
                <span class="wert">{n ?? '–'}</span>
                <div class="spur" role="img" aria-label={t('{label}: {n} von 10, Durchschnitt {schnitt}', { label: kriteriumLabel(ANKER[k].label), n: n ?? t('nicht bewertet'), schnitt: zahl2(schnitt) })}>
                  <div class="fuell" style={{ width: `${(n ?? 0) * 10}%` }} />
                  {schnitt !== null && <div class="schnitt" style={{ left: `${schnitt * 10}%` }} />}
                </div>
                <span class="anker">
                  {n === null
                    ? t('Nicht bewertet. Zählt weder in Zähler noch Nenner.')
                    : anker.map((a) => `${a.stufe}: ${a.text}`).join('  ·  ')}
                </span>
              </div>
            );
          })}
        </div>
        <div class="legende">
          <span>
            <i /> {t('diese Note')}
          </span>
          <span>
            <i class="strich" /> {t('Ø aller Becher')}
          </span>
        </div>
      </section>

      <section class="karte" style={{ marginTop: '14px' }}>
        <details>
          <summary style={{ cursor: 'pointer', minHeight: '44px', padding: '10px 0', fontWeight: 600 }}>{t('Netzdiagramm anzeigen')}</summary>
        <Netzdiagramm
          titel={t('Netzdiagramm der sieben Noten')}
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
