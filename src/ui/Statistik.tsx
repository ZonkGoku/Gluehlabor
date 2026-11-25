import { filtere, saisons } from '../lib/auswertung';
import { zahl2 } from '../lib/format';
import { KRITERIEN } from '../lib/modell';
import { befunde, diagnose, kriteriumStatistik, pegel, ueberblick } from '../lib/statistik';
import { Betreiber, SaisonSchalter } from './bausteine';
import { leseEinstellung } from '../daten/db';
import { useEintraege, useGewichte, useSaison } from './daten';
import { useLive } from './hooks';
import { LABELS } from './stammdaten';
import { t, kriteriumLabel } from '../i18n';

const STUFEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pos = (stufe: number) => `${((stufe - 1) / 9) * 100}%`;
const r2 = (x: number | null) => (x === null ? '–' : x.toFixed(2).replace('-', '−'));

export function Statistik() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison(alle);
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  if (!alle) return null;
  if (!pruefstelle)
    return (
      <div class="karte leer">
        <b>{t('Nur für die Prüfstelle')}</b>
        <a href="#/">{t('Zur Startseite')}</a>
      </div>
    );

  const jahre = [...new Set([...saisons(alle), new Date().getFullYear()])].sort();
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  const stats = KRITERIEN.map((k) => kriteriumStatistik(auswahl, k));
  const b = befunde(auswahl, gewichte, LABELS);
  const u = ueberblick(auswahl, gewichte);
  const p = pegel(auswahl, gewichte);
  const pMax = 10;

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{t('Prüfer-Selbstkontrolle')}</p>
          <h1>{t('Benutzt ihr die Skala?')}</h1>
          <p class="unterzeile">
            {t('{a} Becher, {b} Einzelnoten.', { a: u.eintraege, b: u.einzelnoten })}
          </p>
        </div>
        <SaisonSchalter saisons={jahre} wert={saison} onWahl={setSaison} />
      </div>

      <div class="raster">
        <section class="karte">
          <h2>{t('Befund')}</h2>
          <ul class="befunde">
            {b.map((x) => (
              <li class={`befund s-${x.schwere}`}>
                <span class="marke">{x.schwere === 'warnung' ? t('Achtung') : x.schwere === 'gut' ? t('OK') : t('Hinweis')}</span>
                {x.text}
              </li>
            ))}
          </ul>
        </section>

        <section class="karte">
          <h2>{t('Genutzte Stufen je Kriterium')}</h2>
          <div class="skalennutzung">
            <div class="skalenkopf">
              <span />
              <span class="zahlen">
                {STUFEN.map((s) => (
                  <span style={{ left: pos(s) }}>{s}</span>
                ))}
              </span>
              <span style={{ textAlign: 'right' }}>Ø</span>
            </div>
            {stats.map((s) => (
              <div
                class="reihe"
                title={t('{label}: {min} bis {max}, Ø {mittel}, Stufen {stufen}', { label: kriteriumLabel(LABELS[s.kriterium]), min: s.min ?? '–', max: s.max ?? '–', mittel: zahl2(s.mittel), stufen: s.stufen.join(', ') })}
              >
                <span class="name">{kriteriumLabel(LABELS[s.kriterium])}</span>
                <div class="achse" role="img" aria-label={t('{label}: vergeben {stufen}', { label: kriteriumLabel(LABELS[s.kriterium]), stufen: s.stufen.join(', ') || t('nichts') })}>
                  {s.min !== null && s.max !== null && (
                    <div class="band" style={{ left: pos(s.min), width: `calc(${pos(s.max)} - ${pos(s.min)})` }} />
                  )}
                  {STUFEN.map((st) => (
                    <div class={s.stufen.includes(st) ? 'stufe an' : 'stufe'} style={{ left: pos(st) }} />
                  ))}
                  {s.mittel !== null && <div class="mittel" style={{ left: pos(s.mittel) }} />}
                </div>
                <span class="wert">{zahl2(s.mittel)}</span>
              </div>
            ))}
          </div>
          <div class="legende">
            <span>
              <i style={{ width: '8px', borderRadius: '50%' }} /> {t('vergebene Stufe')}
            </span>
            <span>
              <i class="strich" /> {t('Mittelwert')}
            </span>
          </div>
        </section>

        <section class="karte">
          <h2>{t('Kennzahlen')}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table class="tabelle">
              <thead>
                <tr>
                  <th>{t('Kriterium')}</th>
                  <th class="num">Ø</th>
                  <th class="num">Min</th>
                  <th class="num">Max</th>
                  <th class="num">{t('Spanne')}</th>
                  <th class="num">{t('Streuung')}</th>
                  <th class="num">{t('Korr. Geschmack')}</th>
                  <th>{t('Diagnose')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const diag = diagnose(s);
                  return (
                    <tr style={{ cursor: 'default' }}>
                      <td>
                        <b>{kriteriumLabel(LABELS[s.kriterium])}</b>
                      </td>
                      <td class="num">{zahl2(s.mittel)}</td>
                      <td class="num">{s.min ?? '–'}</td>
                      <td class="num">{s.max ?? '–'}</td>
                      <td class="num">{s.spanne ?? '–'}</td>
                      <td class="num">{zahl2(s.streuung)}</td>
                      <td class="num">{s.kriterium === 'geschmack' ? '—' : r2(s.korrGeschmack)}</td>
                      <td class="diagnose">{diag.join(' · ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div class="raster raster-2">
          <section class="karte">
            <h2>{t('Schmeckt es ab dem dritten besser?')}</h2>
            <div class="pegel" role="list">
              {p.map((x) => (
                <div class="saeule" role="listitem" title={t('{nr}. Becher: {n}×, Ø {mittel}', { nr: `${x.becherNr}${x.becherNr === 5 ? '+' : ''}`, n: x.anzahl, mittel: zahl2(x.mittel) })}>
                  <div
                    class={x.mittel === null ? 'fuellung ohne' : 'fuellung'}
                    style={{ height: `${((x.mittel ?? 0.2) / pMax) * 100}%` }}
                  />
                  <span class="w">{zahl2(x.mittel)}</span>
                  <span class="l">
                    {x.becherNr === 5 ? '5.+' : `${x.becherNr}.`} · {x.anzahl}×
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '14px 0 0' }}>
              {t('Steigt die Note mit der Becher-Nr., bewertet ihr den Pegel mit. Dafür muss die Becher-Nr. bei der Erfassung gesetzt sein; die App schlägt sie automatisch vor.')}
            </p>
          </section>

          <section class="karte">
            <h2>{t('Überblick')}</h2>
            <div class="raster raster-kpi" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div class="kpi" style={{ padding: 0 }}>
                <div class="wert">{u.zehner}</div>
                <div class="label">{t('mal die 10')}</div>
              </div>
              <div class="kpi" style={{ padding: 0 }}>
                <div class="wert">{u.einsOderZwei}</div>
                <div class="label">{t('mal eine 1 oder 2')}</div>
              </div>
              <div class="kpi" style={{ padding: 0 }}>
                <div class="wert">{zahl2(u.beste)}</div>
                <div class="label">{t('beste Gesamtnote')}</div>
              </div>
              <div class="kpi" style={{ padding: 0 }}>
                <div class="wert">{zahl2(u.schlechteste)}</div>
                <div class="label">{t('schlechteste Gesamtnote')}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Betreiber />
    </>
  );
}
