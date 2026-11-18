import { useEffect, useState } from 'preact/hooks';
import { ApiFehler } from '../daten/api';
import { API_URL } from '../daten/config';
import { MELDEGRUENDE, meldeBecher } from '../daten/sync';
import { ankerFuer } from '../lib/anker';
import { anzeigeName } from '../lib/community';
import { filtere, ranglisteMitWertung } from '../lib/auswertung';
import { euro, zahl2 } from '../lib/format';
import { KRITERIEN } from '../lib/modell';
import { stadtVon } from '../lib/orte';
import { bewerte } from '../lib/scoring';
import { kriteriumStatistik } from '../lib/statistik';
import { datumKurz, UrteilPill } from './bausteine';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { ANKER, MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';

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
        <b>Diesen Becher gibt es nicht.</b>
        <a href="#/rangliste">Zur Rangliste</a>
      </div>
    );

  const w = bewerte(e.noten, gewichte);
  const saisonZeilen = ranglisteMitWertung(filtere(alle, { saison: e.saison, markt: 'alle' }), gewichte);
  const rang = saisonZeilen.find((z) => z.eintrag.id === e.id)?.rang;
  const meta = [
    e.markt,
    stadtVon(MARKTLISTE, e),
    `von ${anzeigeName(e)}`,
    `Saison ${e.saison}`,
    datumKurz(e.datum),
    e.sorte && SORTE[e.sorte],
    e.becherNr !== undefined && `${e.becherNr}. Becher des Abends`,
    e.preis !== undefined && euro(e.preis),
  ].filter(Boolean) as string[];

  return (
    <>
      <a class="zurueck" href="#/rangliste">
        <Symbol name="zurueck" groesse={18} /> Rangliste
      </a>
      <div class="detail-kopf">
        <section class="karte spitze">
          <img class="siegel" src="./logo.svg" alt="" />
          <p class="eyebrow">
            {rang ? `Platz ${rang} von ${saisonZeilen.length} · Saison ${e.saison}` : `Saison ${e.saison}`}
          </p>
          <div class="stand">{e.stand}</div>
          <div class="zahlen">
            <span class="zahl-gross">{zahl2(w.gesamt)}</span>
            <span class="teil">
              Glühwein <b>{zahl2(w.gluehwein)}</b>
              <br />
              Drumherum <b>{zahl2(w.drumherum)}</b>
            </span>
            <UrteilPill urteil={w.urteil} />
          </div>
        </section>
        <section class="karte">
          <h2>Protokoll</h2>
          <div class="metaliste">
            {e.pruefstelle && <span class="chip-klein gold">Prüfstelle</span>}
            {meta.map((m) => (
              <span class="chip-klein">{m}</span>
            ))}
          </div>
          {e.notiz && <p style={{ margin: '14px 0 0', lineHeight: 1.5 }}>„{e.notiz}"</p>}
          {fotoUrl && <img class="foto" src={fotoUrl} alt={`Foto vom Stand ${e.stand}`} />}
          {e.geraet === geraetId && e.besuchId && (
            <p style={{ margin: '14px 0 0' }}>
              <a class="pillknopf" href={`#/teilen?e=${encodeURIComponent(e.id)}`}>
                QR zum Mitbewerten zeigen
              </a>
            </p>
          )}
          {API_URL && e.geraet !== geraetId && e.sync !== 'bestand' && !e.pruefstelle && (
            <div style={{ marginTop: '14px' }}>
              {!meldenOffen ? (
                <button type="button" class="besuch-aus" style={{ padding: 0 }} onClick={() => setMeldenOffen(true)}>
                  Diesen Eintrag melden
                </button>
              ) : (
                <div class="melde-form">
                  <label for="melde-grund">Was stimmt nicht?</label>
                  <select id="melde-grund" class="auswahl" value={grund} onChange={(ev) => setGrund((ev.target as HTMLSelectElement).value)}>
                    {MELDEGRUENDE.map((g) => (
                      <option value={g.wert}>{g.label}</option>
                    ))}
                  </select>
                  <input
                    class="feld"
                    style={{ height: '40px', fontSize: '15px' }}
                    type="text"
                    maxLength={300}
                    placeholder="Kurze Erklärung (freiwillig)"
                    aria-label="Erklärung zur Meldung"
                    value={meldeText}
                    onInput={(ev) => setMeldeText((ev.target as HTMLInputElement).value)}
                  />
                  <div class="knopfreihe" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      class="pillknopf"
                      onClick={async () => {
                        setMeldung('Sende …');
                        try {
                          await meldeBecher(e.id, grund, meldeText);
                          setMeldung('Danke. Wir sehen uns den Eintrag an.');
                          setMeldenOffen(false);
                        } catch (err) {
                          setMeldung(err instanceof ApiFehler ? err.message : 'Kein Netz. Bitte später erneut versuchen.');
                        }
                      }}
                    >
                      Melden
                    </button>
                    <button type="button" class="pillknopf" onClick={() => setMeldenOffen(false)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
              {meldung && <p class="meldung" style={{ margin: '8px 0 0' }}>{meldung}</p>}
            </div>
          )}
          {e.sync === 'offen' && (
            <p style={{ color: 'var(--warnung)', fontSize: '13px', margin: '14px 0 0' }}>
              Noch nur auf diesem Gerät. Wird synchronisiert, sobald Netz da ist.
            </p>
          )}
        </section>
      </div>

      <section class="karte" style={{ marginTop: '14px' }}>
        <h2>Profil der sieben Noten</h2>
        <div class="profil">
          {KRITERIEN.map((k) => {
            const n = e.noten[k];
            const schnitt = kriteriumStatistik(alle, k).mittel;
            const anker = n === null ? [] : ankerFuer(ANKER[k], n);
            return (
              <div class="kriterium">
                <span class="krit">
                  {ANKER[k].label}
                  <small>×{gewichte[k]}</small>
                </span>
                <span class="wert">{n ?? '–'}</span>
                <div class="spur" role="img" aria-label={`${ANKER[k].label}: ${n ?? 'nicht bewertet'} von 10, Durchschnitt ${zahl2(schnitt)}`}>
                  <div class="fuell" style={{ width: `${(n ?? 0) * 10}%` }} />
                  {schnitt !== null && <div class="schnitt" style={{ left: `${schnitt * 10}%` }} />}
                </div>
                <span class="anker">
                  {n === null
                    ? 'Nicht bewertet. Zählt weder in Zähler noch Nenner.'
                    : anker.map((a) => `${a.stufe}: ${a.text}`).join('  ·  ')}
                </span>
              </div>
            );
          })}
        </div>
        <div class="legende">
          <span>
            <i /> diese Note
          </span>
          <span>
            <i class="strich" /> Ø aller Becher
          </span>
        </div>
      </section>
    </>
  );
}
