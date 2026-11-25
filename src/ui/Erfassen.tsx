// Der Erfassungsscreen. Eine Ansicht, sieben Skalen, kein Scrollen.
// Keine Rechenlogik hier: Wertung, Anker, Becher-Nr. kommen aus src/lib.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { db, leseEinstellung, leseGewichte, speichereNeuenEintrag } from '../daten/db';
import {
  leseEntwurf,
  leseEntwurfFoto,
  schreibeEntwurf,
  schreibeEntwurfFoto,
  type Entwurf,
} from '../daten/entwurf';
import { verkleinereFoto } from '../daten/foto';
import { synchronisiere } from '../daten/sync';
import { abendDatum, naechsteBecherNr } from '../lib/abend';
import { besuchIdAusBytes } from '../lib/besuch';
import { istOrtsname } from '../lib/community';
import { ortTeile, stadtVon, zerlegeFreienMarkt } from '../lib/orte';
import { baueStaende } from '../lib/staende';
import { maerkteIn } from '../lib/ortssuche';
import { kanonischerStand, schlageStaendeVor, type Vorschlag } from '../lib/standvorschlag';
import { ANKER, MARKTLISTE } from './stammdaten';
import { euro, probeNr, sterneText } from '../lib/format';
import { DEFAULT_GEWICHTE, KRITERIEN, leereNoten, SORTEN, type Eintrag, type Kriterium, type Sorte } from '../lib/modell';
import { bewerte } from '../lib/scoring';
import { berechnePreisLeistung, MENGEN, PREIS_MAX, PREIS_MIN, referenzPreis, vergleichbar } from '../lib/preisleistung';
import { schonBewertet } from '../lib/staende';
import { useGeraetId } from './daten';
import { useLive } from './hooks';
import { MenueBlatt } from './nacht/MenueBlatt';
import { NameBlatt } from './nacht/NameBlatt';
import { QrBlatt } from './nacht/QrBlatt';
import { NotenZeile } from './NotenZeile';
import { Sterne } from './nacht/SterneWert';
import { SyncAnzeige } from './SyncAnzeige';
import { TicketBlatt } from './nacht/TicketBlatt';
import { OrtBlatt } from './nacht/OrtBlatt';
import { Symbol } from './Symbol';
import { leseLetzterPreis, leseZuletzt, merkeOrt, merkePreis } from '../daten/zuletzt';
import { aktuelleSprache, t, kriteriumLabel } from '../i18n';


const SORTE_LABEL: Record<Sorte, string> = {
  rot: 'Rot',
  weiss: 'Weiß',
  kirsch: 'Kirsch',
  winzer: 'Winzer',
  feuerzangen: 'Feuerzange',
  alkoholfrei: 'Alkoholfrei',
  sonstiges: 'Sonstiges',
};
const SCHNELLPREISE = [4, 4.5, 5, 5.5, 6];

/** „4,5" oder "4.50" → 4.5; ungültig oder außerhalb des plausiblen Bereichs → undefined. */
function leseEuro(text: string): number | undefined {
  const x = Number(text.trim().replace(',', '.').replace(/\s*€$/, ''));
  return Number.isFinite(x) && x >= PREIS_MIN && x <= PREIS_MAX ? Math.round(x * 100) / 100 : undefined;
}

function neueId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function leererEntwurf(stadt?: string, markt?: string, sorte?: Sorte): Entwurf {
  return { stand: '', markt: markt?.trim() || MARKTLISTE.sonstiger, stadt, marktFrei: false, sorte, notiz: '', noten: leereNoten() };
}

/** Alte Entwürfe (Marktliste, freie Eingabe „Markt, Stadt") auf Stadt + Markt bringen. */
function migriere(e: Entwurf): Entwurf {
  if (e.gesperrt) return e;
  let { markt, stadt } = e;
  if (e.marktFrei) {
    const frei = zerlegeFreienMarkt(markt);
    markt = frei.markt;
    stadt ||= frei.stadt;
  }
  markt = markt?.trim() || MARKTLISTE.sonstiger;
  stadt = stadt?.trim() || stadtVon(MARKTLISTE, { markt }) || undefined;
  if (stadt && !istOrtsname(stadt)) stadt = undefined; // z. B. ein eingefügter Satz: neu wählen lassen
  return { ...e, markt, stadt, marktFrei: false };
}

/** Beim ersten Öffnen: zuletzt gewählter Ort, sonst leer. */
function startEntwurf(): Entwurf {
  const gespeichert = leseEntwurf();
  if (gespeichert) return migriere(gespeichert);
  const z = leseZuletzt()[0];
  return leererEntwurf(z?.stadt, z?.markt);
}

export function Erfassen() {
  const gewichte = useLive(leseGewichte, [], { ...DEFAULT_GEWICHTE });
  const anzahl = useLive(() => db.eintraege.count(), [], 0);
  const heute = abendDatum(new Date());
  const heutige = useLive(() => db.eintraege.where('datum').equals(heute).toArray(), [heute], []);

  const [e, setE] = useState<Entwurf>(startEntwurf);
  const [ortOffen, setOrtOffen] = useState(false);
  const [nameOffen, setNameOffen] = useState(false);
  const [menueOffen, setMenueOffen] = useState(false);
  const [qrOffen, setQrOffen] = useState(false);
  // Zwei Schritte: erst „Wo?" (Stadt, Stand, Markt freiwillig), dann „Bewerten" (Preis und Noten).
  const [schritt, setSchritt] = useState<'wo' | 'bewerten'>(() => {
    const d = leseEntwurf();
    return d && (d.gesperrt || (d.stand.trim() && d.stadt)) ? 'bewerten' : 'wo';
  });
  const [warnung, setWarnung] = useState<string | null>(null);
  const [preisText, setPreisText] = useState(() => {
    const p = leseEntwurf()?.preis;
    return p === undefined ? '' : String(p).replace('.', ',');
  });
  const [preisFehlt, setPreisFehlt] = useState(false);
  const geraetId = useGeraetId();
  const [becherNrAngefasst, setBecherNrAngefasst] = useState(() => leseEntwurf()?.becherNr !== undefined);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [hilfeOffen, setHilfeOffen] = useState<Kriterium | null>(null);
  const [fehlt, setFehlt] = useState(false);
  const [gespeichert, setGespeichert] = useState<string | null>(null);
  const [fertigId, setFertigId] = useState<string | null>(null);
  const standRef = useRef<HTMLInputElement>(null);
  // Alle Becher dieses Geräts, auch die schon synchronisierten der Community: daraus kommen die Vorschläge.
  const bestand = useLive(() => db.eintraege.toArray(), [], []);

  useEffect(() => {
    void leseEntwurfFoto().then(setFoto);
  }, []);

  // Entwurf bei jeder Änderung sichern.
  useEffect(() => schreibeEntwurf(e), [e]);

  // Becher-Nr. vorschlagen, solange niemand sie selbst gewählt hat.
  const vorschlagNr = naechsteBecherNr(heutige, heute);
  const becherNr = becherNrAngefasst ? e.becherNr : vorschlagNr;

  // Preis-Leistung rechnet die App selbst: aus dem Preis, der Größe und deinen Glühwein-Noten, gegen den üblichen Preis der Stadt.
  const referenz = useMemo(() => referenzPreis(bestand, e.stadt, MARKTLISTE), [bestand, e.stadt]);
  const plAuto = useMemo(() => berechnePreisLeistung(e.noten, gewichte, e.preis, e.menge, referenz, e.sorte), [e.noten, gewichte, e.preis, e.menge, referenz, e.sorte]);
  const notenGesamt = useMemo(() => ({ ...e.noten, preisLeistung: plAuto }), [e.noten, plAuto]);
  const wertung = useMemo(() => bewerte(notenGesamt, gewichte), [notenGesamt, gewichte]);
  // Schnellwahl beim Preis: zuerst der zuletzt eingetragene Preis in dieser Stadt
  const letzterPreis = useMemo(() => leseLetzterPreis(e.stadt), [e.stadt, fertigId]);
  const schnell = letzterPreis && !SCHNELLPREISE.includes(letzterPreis) ? [letzterPreis, ...SCHNELLPREISE.slice(0, 4)] : SCHNELLPREISE;
  // Schon bewertete Stände dieser Stadt als große Tippflächen, solange noch kein Stand eingetragen ist
  const staendeHier = useMemo(
    () =>
      e.stadt
        ? baueStaende(bestand.filter((b) => stadtVon(MARKTLISTE, b) === e.stadt), MARKTLISTE, gewichte)
            .sort((a, b) => b.wert.anzahl - a.wert.anzahl || a.stand.localeCompare(b.stand, 'de'))
            .slice(0, 8)
            .map((x) => ({ stand: x.stand, markt: x.markt, stadt: x.stadt, anzahl: x.wert.anzahl }))
        : [],
    [bestand, e.stadt, gewichte],
  );
  // Vorschläge nur aus echten Ständen, nie der eigenen halb getippten Eingabe: der Entwurf zählt erst nach dem Speichern.
  const vorschlaege = useMemo(() => {
    const markt = e.markt !== MARKTLISTE.sonstiger ? e.markt : undefined;
    const alle = schlageStaendeVor(
      bestand.map((b) => ({ stand: b.stand, markt: b.markt, stadt: stadtVon(MARKTLISTE, b) ?? undefined })),
      e.stand,
      markt,
      5,
      e.stadt,
    );
    // Genau die Eingabe am selben Markt braucht keinen Vorschlag
    return alle.filter((v) => !(v.stand === e.stand.trim() && (!markt || v.markt === markt)));
  }, [bestand, e.stand, e.markt, e.stadt]);
  const bewertet = KRITERIEN.filter((k) => k !== 'preisLeistung' && e.noten[k] !== null).length;

  const setNote = (k: Kriterium, n: number | null) => setE((x) => ({ ...x, noten: { ...x.noten, [k]: n } }));

  const waehleFoto = async (ev: Event) => {
    const datei = (ev.target as HTMLInputElement).files?.[0];
    if (!datei) return;
    const klein = await verkleinereFoto(datei);
    setFoto(klein);
    await schreibeEntwurfFoto(klein);
  };

  /** Vorschlag übernehmen: Stand, Markt und Stadt aus dem vorhandenen Becher. */
  const uebernimm = (v: Vorschlag) => {
    setE((x) => ({ ...x, stand: v.stand, markt: v.markt, stadt: v.stadt ?? stadtVon(MARKTLISTE, { markt: v.markt }) ?? undefined, marktFrei: false }));
  };

  const waehleOrt = (stadt: string, markt: string) => {
    setE((x) => ({ ...x, stadt, markt, marktFrei: false }));
    merkeOrt(stadt, markt === MARKTLISTE.sonstiger ? undefined : markt);
    setOrtOffen(false);
  };

  const speichern = async (nameBestaetigt = false) => {
    const stand = kanonischerStand(bestand, e.stand, e.markt, e.stadt);
    if (!stand) {
      setFehlt(true);
      standRef.current?.focus();
      return;
    }
    if (!e.gesperrt && !e.stadt?.trim()) {
      // Ohne Stadt keine Bewertung: Sie ist das Wichtigste für Rangliste und Karte.
      setOrtOffen(true);
      return;
    }
    if (e.preis === undefined) {
      // Ohne Preis keine Preis-Leistung: Der Preis ist Pflicht.
      setPreisFehlt(true);
      return;
    }
    const jetzt = new Date();
    // Eine Bewertung je Stand und Abend. Dieselbe Regel prüft der Server.
    if (schonBewertet(bestand, geraetId, { stand, markt: e.markt.trim() || MARKTLISTE.sonstiger, stadt: e.stadt?.trim(), datum: abendDatum(jetzt), erstelltAm: jetzt.getTime() })) {
      setWarnung(t('Heute Abend schon bewertet'));
      setTimeout(() => setWarnung(null), 3500);
      return;
    }
    // Ohne Namen keine Bewertung: erst fragen, dann weiter.
    if (!nameBestaetigt && !(await leseEinstellung<string>('name', ''))) {
      setNameOffen(true);
      return;
    }
    const eintrag: Eintrag = {
      id: neueId(),
      stand,
      markt: MARKTLISTE.sonstiger,
      saison: jetzt.getFullYear(),
      datum: abendDatum(jetzt),
      noten: { ...notenGesamt },
      erstelltAm: jetzt.getTime(),
    };
    // Jeder Becher gehört zu einem Besuch. Wer den QR-Code zeigt oder scannt, teilt sich dieselbe Nr.
    eintrag.besuchId = e.besuchId ?? besuchIdAusBytes(crypto.getRandomValues(new Uint8Array(8)));
    // Stadt und Markt: aus dem gescannten Besuch oder aus der Ortswahl. „Sonstiger" heißt: kein bestimmter Markt.
    eintrag.markt = e.markt.trim() || MARKTLISTE.sonstiger;
    if (e.stadt?.trim()) eintrag.stadt = e.stadt.trim();
    if (e.sorte) eintrag.sorte = e.sorte;
    if (becherNr !== undefined) eintrag.becherNr = becherNr;
    eintrag.preis = e.preis;
    merkePreis(e.stadt, e.preis);
    if (e.menge !== undefined) eintrag.menge = e.menge;
    if (e.notiz.trim()) eintrag.notiz = e.notiz.trim();

    await speichereNeuenEintrag(eintrag, foto ?? undefined);
    // Ab hier ist der Becher sicher auf dem Gerät.
    if (eintrag.stadt) merkeOrt(eintrag.stadt, eintrag.markt === MARKTLISTE.sonstiger ? undefined : eintrag.markt);
    await schreibeEntwurfFoto(null);
    const neu = leererEntwurf(eintrag.stadt, eintrag.markt, e.sorte);
    setE(neu);
    setPreisText('');
    setPreisFehlt(false);
    setBecherNrAngefasst(false);
    setFoto(null);
    setFehlt(false);
    setHilfeOffen(null);
    setSchritt('wo');
    setGespeichert(t('Probe {n} gesichert', { n: probeNr(anzahl + 1) }));
    setFertigId(eintrag.id);
    navigator.vibrate?.([20, 40, 20]);
    setTimeout(() => setGespeichert(null), 2200);
    void synchronisiere();
  };

  // Besuch teilen: Besuchs-Nr. vergeben und den QR-Code als Blatt zeigen. Stand und Stadt gehören in den Link.
  const oeffneQr = () => {
    if (!e.stand.trim()) {
      setFehlt(true);
      standRef.current?.focus();
      return;
    }
    if (!e.stadt?.trim()) {
      setOrtOffen(true);
      return;
    }
    if (!e.besuchId) setE((x) => ({ ...x, besuchId: besuchIdAusBytes(crypto.getRandomValues(new Uint8Array(8))) }));
    setQrOffen(true);
  };

  // Stände zur Auswahl: ohne Eingabe die schon bewerteten der Stadt, mit Eingabe die passenden
  const woListe: Vorschlag[] = e.stand.trim().length >= 2 ? vorschlaege : staendeHier;
  const marktAuswahl = useMemo(() => (e.stadt ? maerkteIn(bestand, MARKTLISTE, e.stadt).slice(0, 12) : []), [bestand, e.stadt]);
  const fotoUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => void (fotoUrl && URL.revokeObjectURL(fotoUrl)), [fotoUrl]);
  const waehleStand = (v: Vorschlag) => {
    uebernimm(v);
    setSchritt('bewerten');
  };
  const weiterMitStand = () => {
    if (!e.stand.trim()) {
      setFehlt(true);
      standRef.current?.focus();
      return;
    }
    setSchritt('bewerten');
  };
  const standAendern = () => {
    if (e.gesperrt) setE({ ...e, gesperrt: false, besuchId: undefined });
    setSchritt('wo');
  };
  // Ohne Stadt geht es nicht weiter: gleich fragen
  useEffect(() => {
    if (schritt === 'wo' && !e.stadt) setOrtOffen(true);
  }, []);

  const knopfText = warnung ?? gespeichert ?? (bewertet === 0 ? t('Noch keine Sterne') : t('Speichern'));

  return (
    <>
    <main class="erf">
      <header class="kopf kopf-bewerten">
        <a href="#/" class="kopf-zurueck" aria-label={t('Zurück zur Übersicht')}>
          <Symbol name="pfeil" groesse={18} />
          {t('Zurück')}
        </a>
        <span class="titel">{t('Bewerten')}</span>
        <SyncAnzeige />
        <button type="button" class="kopf-menue" onClick={() => setMenueOffen(true)} aria-haspopup="dialog">
          {t('Menü')}
        </button>
      </header>

      {schritt === 'wo' ? (
        <section class="wo" aria-label={t('Wo bewertest du?')}>
          <h1 class="wo-titel">{t('Wo bewertest du?')}</h1>
          <button type="button" class={`ort-knopf${e.stadt ? '' : ' leer-ort'}`} onClick={() => setOrtOffen(true)} aria-label={t('Stadt wählen')}>
            <span class="ort-symbol">
              <Symbol name="pin" groesse={20} />
            </span>
            <span class="ort-text">
              {e.stadt ? (
                <>
                  <b>{e.stadt}</b>
                  <small>{t('Stadt ändern')}</small>
                </>
              ) : (
                <>
                  <b>{t('In welcher Stadt bist du?')}</b>
                  <small>{t('Stadt suchen')}</small>
                </>
              )}
            </span>
            <span class="ort-pfeil">
              <Symbol name="pfeil" groesse={18} />
            </span>
          </button>

          {e.stadt && (
            <>
              <label class="wo-frage" for="wo-stand">
                {t('An welchem Stand?')}
              </label>
              <input
                id="wo-stand"
                ref={standRef}
                class="feld wo-feld"
                type="text"
                placeholder={t('Name des Stands')}
                aria-invalid={fehlt && !e.stand.trim()}
                autocomplete="off"
                autocapitalize="words"
                enterkeyhint="go"
                value={e.stand}
                onInput={(ev) => setE({ ...e, stand: (ev.target as HTMLInputElement).value })}
                onKeyDown={(ev) => ev.key === 'Enter' && weiterMitStand()}
              />
              {woListe.length > 0 && (
                <>
                  <p class="wo-hinweis">{e.stand.trim().length >= 2 ? t('Meinst du:') : t('Schon bewertet:')}</p>
                  <ul class="wo-liste">
                    {woListe.map((v) => (
                      <li>
                        <button type="button" onClick={() => waehleStand(v)}>
                          <span class="wo-name">{v.stand}</span>
                          <span class="wo-ort">{ortTeile(MARKTLISTE, v).join(' · ') || v.markt}</span>
                          <span class="wo-zahl">{v.anzahl}×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {e.stand.trim().length >= 2 && marktAuswahl.length > 0 && (
                <div class="wo-maerkte">
                  <p class="wo-hinweis">{t('Markt (freiwillig)')}</p>
                  <div>
                    {marktAuswahl.map((m) => (
                      <button
                        type="button"
                        aria-pressed={e.markt === m.markt}
                        class={e.markt === m.markt ? 'an' : ''}
                        onClick={() => setE({ ...e, markt: e.markt === m.markt ? MARKTLISTE.sonstiger : m.markt })}
                      >
                        {m.markt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" class="wo-weiter" disabled={e.stand.trim().length < 2} onClick={weiterMitStand}>
                {e.stand.trim().length >= 2 ? t('Weiter mit „{stand}"', { stand: e.stand.trim() }) : t('Stand wählen')}
              </button>
            </>
          )}
        </section>
      ) : (
      <>
      <div class="besuch-zeile">
        <div class="besuch-text">
          <b>{e.stand}</b>
          <span>{[e.markt !== MARKTLISTE.sonstiger ? e.markt : null, e.stadt].filter(Boolean).join(' · ')}</span>
        </div>
        <button type="button" class="besuch-aus" onClick={standAendern}>
          {e.gesperrt ? t('Anderer Stand') : t('Ändern')}
        </button>
      </div>

      <button type="button" class="qr-zeile" onClick={oeffneQr}>
        <span class="qr-zeile-text">
          <b>{t('Seid ihr zu mehreren?')}</b>
          <small>{t('QR-Code zeigen')}</small>
        </span>
        <span class="qr-zeile-code" aria-hidden="true">QR</span>
      </button>

      <section class={`preis-block${e.preis === undefined ? ' leer' : ' gesetzt'}${preisFehlt && e.preis === undefined ? ' fehlt' : ''}`} aria-label={t('Preis')}>
        <div class="preis-kopf">
          <span class="preis-titel">
            {t('Preis der Tasse')} <b>{t('Pflicht')}</b>
          </span>
          <select
            class="preis-groesse"
            aria-label={t('Größe der Tasse')}
            value={e.menge ?? ''}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setE({ ...e, menge: v ? Number(v) : undefined });
            }}
          >
            <option value="">{t('Größe')} 0,2 l</option>
            {MENGEN.map((m) => (
              <option value={m}>{String(m).replace('.', aktuelleSprache() === 'en' ? '.' : ',')} l</option>
            ))}
          </select>
        </div>
        <div class="preis-zeile">
          <label class="preis-eingabe">
            <input
              type="text"
              inputMode="decimal"
              autocomplete="off"
              maxLength={6}
              placeholder="0,00"
              aria-label={t('Preis in Euro, ohne Pfand')}
              aria-required="true"
              aria-invalid={preisFehlt && e.preis === undefined}
              value={preisText}
              onInput={(ev) => {
                const v = (ev.target as HTMLInputElement).value;
                setPreisText(v);
                setE((x) => ({ ...x, preis: leseEuro(v) }));
              }}
              onBlur={() => e.preis !== undefined && setPreisText(String(e.preis).replace('.', ','))}
            />
            <span aria-hidden="true">€</span>
          </label>
          <div class="preis-schnell" role="group" aria-label={t('Schnellwahl Preis')}>
            {schnell.map((p) => (
              <button
                type="button"
                aria-pressed={e.preis === p}
                class={e.preis === p ? 'an' : p === letzterPreis ? 'letzter' : ''}
                onClick={() => {
                  setPreisText(String(p).replace('.', ','));
                  setE((x) => ({ ...x, preis: p }));
                }}
              >
                {String(p.toFixed(2)).replace('.', ',')}
              </button>
            ))}
          </div>
        </div>
        <p class="preis-hinweis">
          {preisFehlt && e.preis === undefined
            ? t('Bitte den Preis eintragen.')
            : letzterPreis && e.preis === undefined
              ? t('Zuletzt in {stadt}: {preis}', { stadt: e.stadt ?? '', preis: euro(letzterPreis) })
              : t('Ohne Pfand.')}
        </p>
      </section>

      <label class={`foto-knopf${foto ? ' gesetzt' : ''}`}>
        {fotoUrl ? <img src={fotoUrl} alt={t('Dein Foto')} /> : <Symbol name="kamera" groesse={26} />}
        <span>{foto ? t('Foto ändern') : t('Foto hinzufügen')}</span>
        <input type="file" accept="image/*" aria-label={t('Foto')} onChange={waehleFoto} />
      </label>

      <details class="mehr-angaben" open={Boolean(e.sorte || e.notiz.trim())}>
        <summary>{t('Mehr Angaben')}</summary>
        <div class="meta">
          <select
            class={e.sorte ? 'chip gesetzt' : 'chip'}
            aria-label={t('Sorte')}
            value={e.sorte ?? ''}
            onChange={(ev) => setE({ ...e, sorte: ((ev.target as HTMLSelectElement).value || undefined) as Sorte })}
          >
            <option value="">{t('Sorte')}</option>
            {SORTEN.map((x) => (
              <option value={x}>{t(SORTE_LABEL[x])}</option>
            ))}
          </select>
          <select
            class={becherNr !== undefined ? 'chip gesetzt' : 'chip'}
            aria-label={t('Der wievielte Glühwein heute Abend?')}
            value={becherNr ?? ''}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setBecherNrAngefasst(true);
              setE({ ...e, becherNr: v ? Number(v) : undefined });
            }}
          >
            <option value="">{t('– heute')}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option value={n}>{t('{n}. heute', { n })}</option>
            ))}
          </select>
        </div>
        <input class="feld" type="text" placeholder={t('Notiz')} aria-label={t('Notiz')} enterkeyhint="done" value={e.notiz} onInput={(ev) => setE({ ...e, notiz: (ev.target as HTMLInputElement).value })} />
      </details>

      <section class="noten" aria-label={t('Noten')}>
        <p class="noten-kopf">
          {t('Sterne')} <span>{t('mindestens eine')}</span>
        </p>
        {KRITERIEN.map((k) => (
          <NotenZeile
            key={k}
            name={kriteriumLabel(ANKER[k].label)}
            wert={k === 'preisLeistung' ? plAuto : e.noten[k]}
            onWert={k === 'preisLeistung' ? undefined : (n) => setNote(k, n)}
            auto={k === 'preisLeistung'}
            offen={hilfeOffen === k}
            onHilfe={() => setHilfeOffen(hilfeOffen === k ? null : k)}
            anker={Object.entries(ANKER[k].anker)
              .map(([stufe, text]) => ({ stufe: Number(stufe), text: t(text) }))
              .filter((a) => Number.isFinite(a.stufe))
              .sort((x, y) => y.stufe - x.stufe)}
            hilfeText={
              k === 'preisLeistung'
                ? !vergleichbar(e.sorte)
                  ? t('Alkoholfreies und Feuerzangenbowle lassen sich preislich nicht vergleichen: keine Preis-Leistung.')
                  : t('0,5 Punkte je Euro über oder unter dem üblichen Preis ({ref}{stadt}).', { ref: euro(referenz), stadt: e.stadt ? ` ${t('in')} ${e.stadt}` : '' })
                : undefined
            }
          />
        ))}
      </section>

      <footer class="fuss">
        <div class="messwert" aria-live="polite">
          <span class="kopfzeile">
            <span class={wertung.gesamt === null ? 'gesamt leer' : 'gesamt'}>{sterneText(wertung.gesamt)}</span>
            <Sterne wert={wertung.gesamt} groesse={16} />
          </span>
          <span class="unter">{wertung.urteil ? t(wertung.urteil) : t('{n} von 6 bewertet', { n: bewertet })}</span>
        </div>
        <button
          type="button"
          class={gespeichert ? 'speichern ok' : 'speichern'}
          disabled={bewertet === 0 && !gespeichert}
          onClick={() => void speichern()}
        >
          {fehlt && !e.stand.trim() ? t('Stand fehlt') : preisFehlt && e.preis === undefined ? t('Preis fehlt') : knopfText}
        </button>
      </footer>
      </>
      )}
    </main>
    {ortOffen && (
      <OrtBlatt
        ohneMarkt
        start={{ stadt: e.stadt, markt: e.markt }}
        bestand={bestand}
        onWahl={waehleOrt}
        onZu={() => setOrtOffen(false)}
      />
    )}
    {nameOffen && (
      <NameBlatt
        onZu={() => setNameOffen(false)}
        onFertig={() => {
          setNameOffen(false);
          void speichern(true);
        }}
      />
    )}
    {qrOffen && e.besuchId && (
      <QrBlatt besuch={{ id: e.besuchId, stand: e.stand.trim(), markt: e.markt.trim() || MARKTLISTE.sonstiger, stadt: e.stadt?.trim() || undefined, sorte: e.sorte }} onZu={() => setQrOffen(false)} />
    )}
    {menueOffen && <MenueBlatt onZu={() => setMenueOffen(false)} />}
    {fertigId && <TicketBlatt id={fertigId} onNaechster={() => setFertigId(null)} />}
    </>
  );
}
