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
import { useGeraetId } from './daten';
import { automatischeStadt } from '../daten/standort';
import { GroesseIcon } from './nacht/GroesseIcon';
import { haeufigsteSorte, ordneStaende, standPreisVorschlag } from '../lib/eingabehilfen';
import { SorteIcon } from './nacht/SorteIcon';
import { TAGS } from '../lib/tags';
import { ANKER, MARKTLISTE, MARKT_ZUSATZ } from './stammdaten';
import { euro, probeNr, sterneText } from '../lib/format';
import { DEFAULT_GEWICHTE, KRITERIEN, leereNoten, SORTEN, type Eintrag, type Kriterium, type Sorte } from '../lib/modell';
import { bewerte } from '../lib/scoring';
import { berechnePreisLeistung, MENGEN, PREIS_MAX, PREIS_MIN, referenzPreis, vergleichbar } from '../lib/preisleistung';
import { useLive } from './hooks';
import { NameBlatt } from './nacht/NameBlatt';
import { QrBlatt } from './nacht/QrBlatt';
import { NotenZeile } from './NotenZeile';
import { Sterne } from './nacht/SterneWert';
import { TicketBlatt } from './nacht/TicketBlatt';
import { OrtBlatt } from './nacht/OrtBlatt';
import { Symbol } from './Symbol';
import { KopfIcon } from './nacht/KopfIcon';
import { leseLetzterPreis, leseZuletzt, merkeOrt, merkePreis } from '../daten/zuletzt';
import { aktuelleSprache, t, tn, kriteriumLabel } from '../i18n';


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
  const geraetId = useGeraetId();
  const heute = abendDatum(new Date());
  const heutige = useLive(() => db.eintraege.where('datum').equals(heute).toArray(), [heute], []);

  const [e, setE] = useState<Entwurf>(startEntwurf);
  const [ortOffen, setOrtOffen] = useState(false);
  const [nameOffen, setNameOffen] = useState(false);
  const [qrOffen, setQrOffen] = useState(false);
  // Zwei Schritte: erst „Wo?" (Stadt, Stand, Markt freiwillig), dann „Bewerten" (Preis und Noten).
  const [schritt, setSchritt] = useState<'wo' | 'bewerten'>(() => {
    const d = leseEntwurf();
    return d && (d.gesperrt || (d.stand.trim() && d.stadt)) ? 'bewerten' : 'wo';
  });
  const [preisText, setPreisText] = useState(() => {
    const p = leseEntwurf()?.preis;
    return p === undefined ? '' : String(p).replace('.', ',');
  });
  const [preisFehlt, setPreisFehlt] = useState(false);
  const [foto, setFoto] = useState<Blob | null>(null);
  // Foto für alle sichtbar? Nur wer es ausdrücklich ankreuzt. Die letzte Wahl merkt sich das Gerät, sie steht aber bei jedem Foto sichtbar da.
  const [fotoOeffentlich, setFotoOeffentlich] = useState(() => {
    try {
      return localStorage.getItem('gluehlabor.fotoOeffentlich') === '1';
    } catch {
      return false;
    }
  });
  const waehleOeffentlich = (an: boolean) => {
    setFotoOeffentlich(an);
    try {
      localStorage.setItem('gluehlabor.fotoOeffentlich', an ? '1' : '0');
    } catch {
      /* nicht kritisch */
    }
  };
  const [hilfeOffen, setHilfeOffen] = useState<Kriterium | null>(null);
  const [fehlt, setFehlt] = useState(false);
  const [gespeichert, setGespeichert] = useState<string | null>(null);
  const [fertigId, setFertigId] = useState<string | null>(null);
  const [speicherFehler, setSpeicherFehler] = useState('');
  const standRef = useRef<HTMLInputElement>(null);
  // Alle Becher dieses Geräts, auch die schon synchronisierten der Community: daraus kommen die Vorschläge.
  const bestand = useLive(() => db.eintraege.toArray(), [], []);

  useEffect(() => {
    void leseEntwurfFoto().then(setFoto);
  }, []);

  // Entwurf bei jeder Änderung sichern.
  useEffect(() => schreibeEntwurf(e), [e]);

  // Die Becher-Nr. zählt das System: die eigenen Bewertungen dieses Geräts heute + 1 (nicht auswählbar).
  const becherNr = naechsteBecherNr(heutige.filter((x) => x.geraet === geraetId && x.sync !== 'abgelehnt'), heute);

  // Preis-Leistung rechnet die App selbst: aus dem Preis, der Größe und deinen Glühwein-Noten, gegen den üblichen Preis der Stadt.
  const referenz = useMemo(() => referenzPreis(bestand, e.stadt, MARKTLISTE), [bestand, e.stadt]);
  const plAuto = useMemo(() => berechnePreisLeistung(e.noten, gewichte, e.preis, e.menge, referenz, e.sorte), [e.noten, gewichte, e.preis, e.menge, referenz, e.sorte]);
  const notenGesamt = useMemo(() => ({ ...e.noten, preisLeistung: plAuto }), [e.noten, plAuto]);
  const wertung = useMemo(() => bewerte(notenGesamt, gewichte), [notenGesamt, gewichte]);
  // Schnellwahl beim Preis: zuerst der zuletzt eingetragene Preis in dieser Stadt
  const letzterPreis = useMemo(() => leseLetzterPreis(e.stadt), [e.stadt, fertigId]);
  // Üblicher Preis an diesem Stand (aus den Meldungen anderer) steht als erste Schnellwahl, dann der letzte der Stadt.
  const standPreis = useMemo(
    () => (e.stand.trim() ? standPreisVorschlag(bestand.map((b) => ({ stand: b.stand, stadt: stadtVon(MARKTLISTE, b) ?? undefined, preis: b.preis, menge: b.menge })), e.stand, e.stadt, e.menge) : null),
    [bestand, e.stand, e.stadt, e.menge],
  );
  const schnell = useMemo(() => {
    const vorn = [standPreis, letzterPreis].filter((x): x is number => typeof x === 'number');
    const rest = SCHNELLPREISE.filter((x) => !vorn.includes(x));
    return [...new Set([...vorn, ...rest])].slice(0, 5);
  }, [standPreis, letzterPreis]);
  // Schon bewertete Stände dieser Stadt als große Tippflächen, solange noch kein Stand eingetragen ist
  const staendeHier = useMemo(
    () =>
      e.stadt
        ? ordneStaende(
            baueStaende(bestand.filter((b) => stadtVon(MARKTLISTE, b) === e.stadt), MARKTLISTE, gewichte).map((x) => ({ stand: x.stand, markt: x.markt, stadt: x.stadt, anzahl: x.wert.anzahl })),
            bestand.map((b) => ({ stand: b.stand, stadt: stadtVon(MARKTLISTE, b) ?? undefined, geraet: b.geraet, datum: b.datum, erstelltAm: b.erstelltAm })),
            geraetId,
            heute,
          ).slice(0, 8)
        : [],
    [bestand, e.stadt, gewichte, geraetId, heute],
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
  // Sorte vorwählen: die häufigste des Stands, solange du selbst keine gewählt hast (sichtbar markiert, ein Tipp ändert sie)
  const sorteGewaehlt = useRef(e.sorte !== undefined);
  const standSorte = useMemo(
    () => (e.stand.trim() ? haeufigsteSorte(bestand.map((b) => ({ stand: b.stand, stadt: stadtVon(MARKTLISTE, b) ?? undefined, sorte: b.sorte })), e.stand, e.stadt) : undefined),
    [bestand, e.stand, e.stadt],
  );
  useEffect(() => {
    if (schritt === 'bewerten' && !sorteGewaehlt.current && e.sorte === undefined && standSorte) setE((x) => (x.sorte === undefined ? { ...x, sorte: standSorte } : x));
  }, [schritt, standSorte]);
  // Eine Bewertung braucht alle Sterne (Preis-Leistung rechnet die App selbst): jede Probe soll vollständig sein.
  const ALLE_STERNE = KRITERIEN.filter((k) => k !== 'preisLeistung').length;
  const bewertet = KRITERIEN.filter((k) => k !== 'preisLeistung' && e.noten[k] !== null).length;
  const vollstaendig = bewertet === ALLE_STERNE;

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

  const stadtManuell = useRef(false);
  const waehleOrt = (stadt: string, markt: string) => {
    stadtManuell.current = true;
    setE((x) => ({ ...x, stadt, markt, marktFrei: false }));
    merkeOrt(stadt, markt === MARKTLISTE.sonstiger ? undefined : markt);
    setOrtOffen(false);
  };

  const speichernInnen = async (nameBestaetigt = false) => {
    if (!vollstaendig) return; // alle Sterne nötig (der Knopf ist dann auch gesperrt)
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
    if (e.tags && e.tags.length > 0) eintrag.tags = e.tags;

    await speichereNeuenEintrag(eintrag, foto ?? undefined, Boolean(foto) && fotoOeffentlich);
    // Ab hier ist der Becher sicher auf dem Gerät.
    if (eintrag.stadt) merkeOrt(eintrag.stadt, eintrag.markt === MARKTLISTE.sonstiger ? undefined : eintrag.markt);
    await schreibeEntwurfFoto(null);
    const neu = leererEntwurf(eintrag.stadt, eintrag.markt, e.sorte);
    setE(neu);
    setPreisText('');
    setPreisFehlt(false);
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

  // Scheitert das Speichern (z. B. Speicher des Browsers voll oder gesperrt), soll man das sehen und nicht vor einem toten Knopf stehen.
  const speichern = async (nameBestaetigt = false) => {
    setSpeicherFehler('');
    try {
      await speichernInnen(nameBestaetigt);
    } catch (err) {
      console.error(err);
      setSpeicherFehler(`${t('Das Speichern hat nicht geklappt.')} ${err instanceof Error ? err.message : ''}`.trim());
    }
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
  const marktAuswahl = useMemo(() => (e.stadt ? maerkteIn(bestand, MARKTLISTE, e.stadt, MARKT_ZUSATZ).slice(0, 12) : []), [bestand, e.stadt]);
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
  // Ohne Stadt geht es nicht weiter: gleich fragen. Vorher versucht die App die Stadt aus dem Standort zu setzen (bleibt auf dem Gerät).
  useEffect(() => {
    if (schritt === 'wo' && !e.stadt) setOrtOffen(true);
    if (e.gesperrt || schritt !== 'wo' || e.stand.trim()) return;
    let aktiv = true;
    void automatischeStadt(Boolean(e.stadt)).then((stadt) => {
      if (!aktiv || !stadt || stadtManuell.current) return;
      setE((x) => (x.stadt === stadt ? x : { ...x, stadt, markt: MARKTLISTE.sonstiger, marktFrei: false }));
      merkeOrt(stadt, undefined);
      setOrtOffen(false);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  const knopfText = gespeichert ?? (vollstaendig ? t('Speichern') : tn(ALLE_STERNE - bewertet, 'Noch {n} Stern', 'Noch {n} Sterne'));

  return (
    <>
    <div class="erf">
      <div class="kopf-bewerten">
        <a href="#/" class="kopf-zurueck" aria-label={t('Zurück zur Übersicht')}>
          <Symbol name="pfeil" groesse={18} />
          {t('Zurück')}
        </a>
        <span class="kopf-schritt" aria-hidden="true">
          <i data-an="true" />
          <i data-an={schritt === 'bewerten'} />
        </span>
      </div>

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
                          {'heute' in v && v.heute ? <span class="wo-zahl" title={t('Heute Abend schon bewertet')}>✓</span> : <span class="wo-zahl">{v.anzahl}×</span>}
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
        <span class="kopf-icon" aria-hidden="true" style={{ marginRight: '12px' }}>
          <Symbol name="pin" groesse={22} />
        </span>
        <div class="besuch-text">
          <b>{e.stand}</b>
          <span>{[e.markt !== MARKTLISTE.sonstiger ? e.markt : null, e.stadt].filter(Boolean).join(' · ')}</span>
        </div>
        <button type="button" class="besuch-aus" onClick={standAendern}>
          {e.gesperrt ? t('Anderer Stand') : t('Ändern')}
        </button>
      </div>

      <section class={`preis-block${e.preis === undefined ? ' leer' : ' gesetzt'}${preisFehlt && e.preis === undefined ? ' fehlt' : ''}`} aria-label={t('Preis')}>
        <div class="preis-kopf">
          <span class="preis-titel">
            <KopfIcon name="euro" />
            {t('Preis der Tasse')} <b>{t('Pflicht')}</b> <small class="ohne-pfand">{t('ohne Pfand')}</small>
          </span>
          <div class="groessen" role="radiogroup" aria-label={t('Größe der Tasse')}>
            {MENGEN.map((m) => (
              <button
                type="button"
                role="radio"
                aria-checked={(e.menge ?? 0.2) === m}
                aria-label={`${String(m).replace('.', aktuelleSprache() === 'en' ? '.' : ',')} l`}
                title={`${String(m).replace('.', aktuelleSprache() === 'en' ? '.' : ',')} l`}
                class={(e.menge ?? 0.2) === m ? 'an' : ''}
                onClick={() => setE({ ...e, menge: m === 0.2 ? undefined : m })}
              >
                <GroesseIcon menge={m} />
                <small>{String(m).replace('.', aktuelleSprache() === 'en' ? '.' : ',')}</small>
              </button>
            ))}
          </div>
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
                class={e.preis === p ? 'an' : p === standPreis ? 'vorschlag' : p === letzterPreis ? 'letzter' : ''}
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
        {(preisFehlt || e.preis === undefined) && (standPreis || letzterPreis || preisFehlt) && (
          <p class="preis-hinweis">
            {preisFehlt && e.preis === undefined
              ? t('Bitte den Preis eintragen.')
              : standPreis
                ? t('Hier üblich: {preis}', { preis: euro(standPreis) })
                : t('Zuletzt in {stadt}: {preis}', { stadt: e.stadt ?? '', preis: euro(letzterPreis ?? 0) })}
          </p>
        )}
      </section>

      <div class="sorten" role="radiogroup" aria-label={t('Sorte')}>
        {SORTEN.map((x) => (
          <button
            type="button"
            role="radio"
            aria-checked={e.sorte === x}
            aria-label={t(SORTE_LABEL[x])}
            title={t(SORTE_LABEL[x])}
            class={e.sorte === x ? 'an' : ''}
            onClick={() => {
              sorteGewaehlt.current = true;
              setE({ ...e, sorte: e.sorte === x ? undefined : x });
            }}
          >
            <SorteIcon sorte={x} />
          </button>
        ))}
      </div>

      <section class="noten" aria-label={t('Sterne')}>
        <p class="noten-kopf">
          <KopfIcon name="stern" />
          {t('Sterne')} <span>{bewertet}/{ALLE_STERNE}</span>
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
                  : t('¼ Stern je Euro über oder unter dem üblichen Preis ({ref}{stadt}).', { ref: euro(referenz), stadt: e.stadt ? ` ${t('in')} ${e.stadt}` : '' })
                : undefined
            }
          />
        ))}
      </section>

      <label class={`foto-knopf${foto ? ' gesetzt' : ''}`}>
        {fotoUrl ? <img src={fotoUrl} alt={t('Dein Foto')} /> : <Symbol name="kamera" groesse={26} />}
        <span>{foto ? t('Foto ändern') : t('Foto hinzufügen')}</span>
        <input type="file" accept="image/*" aria-label={t('Foto')} onChange={waehleFoto} />
      </label>
      {foto && (
        <label class="foto-oeffentlich">
          <input type="checkbox" checked={fotoOeffentlich} onChange={(ev) => waehleOeffentlich((ev.target as HTMLInputElement).checked)} />
          <span>
            <b>{t('Foto für alle sichtbar machen')}</b>
            <small>{t('Alle in der App können es sehen, auch ohne Namen auf dem Bild. Du kannst es jederzeit wieder privat machen oder löschen. Bitte nur Fotos ohne erkennbare fremde Personen.')}</small>
          </span>
        </label>
      )}

      <details class="mehr-angaben" open={Boolean(e.notiz.trim() || e.tags?.length)}>
        <summary>
          <KopfIcon name="tag" />
          {t('Mehr Angaben')}
        </summary>
        <div class="tags" role="group" aria-label={t('Schlagwörter')}>
          {TAGS.map((x) => (
            <button
              type="button"
              aria-pressed={Boolean(e.tags?.includes(x.id))}
              class={e.tags?.includes(x.id) ? 'an' : ''}
              onClick={() => setE({ ...e, tags: e.tags?.includes(x.id) ? e.tags.filter((y) => y !== x.id) : [...(e.tags ?? []), x.id] })}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
        <input class="feld" type="text" placeholder={t('Notiz')} aria-label={t('Notiz')} enterkeyhint="done" value={e.notiz} onInput={(ev) => setE({ ...e, notiz: (ev.target as HTMLInputElement).value })} />
      </details>



      <button type="button" class="qr-zeile" onClick={oeffneQr}>
        <span class="qr-zeile-text">
          <b>{t('Seid ihr zu mehreren?')}</b>
          <small>{t('QR-Code zeigen')}</small>
        </span>
        <span class="qr-zeile-code" aria-hidden="true">QR</span>
      </button>

      <footer class="fuss">
        {speicherFehler && (
          <p role="alert" class="m-0 mb-2 w-full text-sm font-semibold text-[var(--warnung)]">
            {speicherFehler} {t('Tippe noch einmal auf Speichern. Hilft das nicht, schließ die App ganz und öffne sie neu.')}
          </p>
        )}
        <div class="messwert" aria-live="polite">
          <span class="kopfzeile">
            <span class={wertung.gesamt === null ? 'gesamt leer' : 'gesamt'}>{sterneText(wertung.gesamt)}</span>
            <Sterne wert={wertung.gesamt} groesse={16} />
          </span>
          <span class="unter">{vollstaendig && wertung.urteil ? t(wertung.urteil) : `${bewertet}/${ALLE_STERNE}`}</span>
        </div>
        <button
          type="button"
          class={gespeichert ? 'speichern ok' : 'speichern'}
          disabled={!vollstaendig && !gespeichert}
          onClick={() => void speichern()}
        >
          {fehlt && !e.stand.trim() ? t('Stand fehlt') : preisFehlt && e.preis === undefined ? t('Preis fehlt') : knopfText}
        </button>
      </footer>
      </>
      )}
    </div>
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
    {fertigId && <TicketBlatt id={fertigId} onNaechster={() => setFertigId(null)} onNochmal={(neu) => setFertigId(neu)} />}
    </>
  );
}
