// Der Erfassungsscreen. Eine Ansicht, sieben Skalen, kein Scrollen.
// Keine Rechenlogik hier: Wertung, Anker, Becher-Nr. kommen aus src/lib.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { db, leseGewichte, speichereNeuenEintrag } from '../daten/db';
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
import { MARKE } from '../marke';
import { ankerFuer } from '../lib/anker';
import { ortTeile, stadtVon, zerlegeFreienMarkt } from '../lib/orte';
import { kanonischerStand, schlageStaendeVor, type Vorschlag } from '../lib/standvorschlag';
import { ANKER, MARKTLISTE } from './stammdaten';
import { euro, probeNr, zahl2 } from '../lib/format';
import { DEFAULT_GEWICHTE, KRITERIEN, leereNoten, SORTEN, type Eintrag, type Kriterium, type Sorte } from '../lib/modell';
import { bewerte } from '../lib/scoring';
import { useLive } from './hooks';
import { Skala } from './Skala';
import { SyncAnzeige } from './SyncAnzeige';
import { TicketBlatt } from './nacht/TicketBlatt';
import { OrtBlatt } from './nacht/OrtBlatt';
import { Symbol } from './Symbol';
import { leseZuletzt, merkeOrt } from '../daten/zuletzt';


const SORTE_LABEL: Record<Sorte, string> = {
  rot: 'Rot',
  weiss: 'Weiß',
  kirsch: 'Kirsch',
  winzer: 'Winzer',
  feuerzangen: 'Feuerzange',
  alkoholfrei: 'Alkoholfrei',
  sonstiges: 'Sonstiges',
};
const PREISE = Array.from({ length: 15 }, (_, i) => 2.5 + i * 0.5); // 2,50 … 9,50 €

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
  const [becherNrAngefasst, setBecherNrAngefasst] = useState(() => leseEntwurf()?.becherNr !== undefined);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [aktiv, setAktiv] = useState<Kriterium>('geschmack');
  const [notizOffen, setNotizOffen] = useState(false);
  const [fehlt, setFehlt] = useState(false);
  const [gespeichert, setGespeichert] = useState<string | null>(null);
  const [fertigId, setFertigId] = useState<string | null>(null);
  const standRef = useRef<HTMLInputElement>(null);
  const [standFokus, setStandFokus] = useState(false);
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

  const wertung = useMemo(() => bewerte(e.noten, gewichte), [e.noten, gewichte]);
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
  const bewertet = KRITERIEN.filter((k) => e.noten[k] !== null).length;

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
    setStandFokus(false);
  };

  const waehleOrt = (stadt: string, markt: string) => {
    setE((x) => ({ ...x, stadt, markt, marktFrei: false }));
    merkeOrt(stadt, markt === MARKTLISTE.sonstiger ? undefined : markt);
    setOrtOffen(false);
  };

  const speichern = async () => {
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
    const jetzt = new Date();
    const eintrag: Eintrag = {
      id: neueId(),
      stand,
      markt: MARKTLISTE.sonstiger,
      saison: jetzt.getFullYear(),
      datum: abendDatum(jetzt),
      noten: { ...e.noten },
      erstelltAm: jetzt.getTime(),
    };
    // Jeder Becher gehört zu einem Besuch. Wer den QR-Code zeigt oder scannt, teilt sich dieselbe Nr.
    eintrag.besuchId = e.besuchId ?? besuchIdAusBytes(crypto.getRandomValues(new Uint8Array(8)));
    // Stadt und Markt: aus dem gescannten Besuch oder aus der Ortswahl. „Sonstiger" heißt: kein bestimmter Markt.
    eintrag.markt = e.markt.trim() || MARKTLISTE.sonstiger;
    if (e.stadt?.trim()) eintrag.stadt = e.stadt.trim();
    if (e.sorte) eintrag.sorte = e.sorte;
    if (becherNr !== undefined) eintrag.becherNr = becherNr;
    if (e.preis !== undefined) eintrag.preis = e.preis;
    if (e.notiz.trim()) eintrag.notiz = e.notiz.trim();

    await speichereNeuenEintrag(eintrag, foto ?? undefined);
    // Ab hier ist der Becher sicher auf dem Gerät.
    if (eintrag.stadt) merkeOrt(eintrag.stadt, eintrag.markt === MARKTLISTE.sonstiger ? undefined : eintrag.markt);
    await schreibeEntwurfFoto(null);
    const neu = leererEntwurf(eintrag.stadt, eintrag.markt, e.sorte);
    setE(neu);
    setBecherNrAngefasst(false);
    setFoto(null);
    setNotizOffen(false);
    setFehlt(false);
    setAktiv('geschmack');
    setGespeichert(`Probe ${probeNr(anzahl + 1)} gesichert`);
    setFertigId(eintrag.id);
    navigator.vibrate?.([20, 40, 20]);
    setTimeout(() => setGespeichert(null), 2200);
    void synchronisiere();
  };

  const def = ANKER[aktiv];
  const anker = ankerFuer(def, e.noten[aktiv]);
  // Besuch teilen: Besuchs-Nr. vergeben, Entwurf sofort sichern, dann QR zeigen.
  const zeigeQr = () => {
    const besuchId = e.besuchId ?? besuchIdAusBytes(crypto.getRandomValues(new Uint8Array(8)));
    schreibeEntwurf({ ...e, besuchId });
    location.hash = '#/teilen';
  };

  const knopfText = gespeichert ?? (bewertet === 0 ? 'Noch keine Note' : 'Speichern');

  return (
    <>
    <main class="erf">
      <header class="kopf">
        <span class="marke">{MARKE.name}</span>
        <span class="titel" />
        <SyncAnzeige />
        {e.stand.trim() && (
          <button type="button" class="kopf-knopf" onClick={zeigeQr} aria-label="QR-Code zum gemeinsamen Bewerten zeigen">
            QR
          </button>
        )}
        <a href="#/" aria-label="Zur Übersicht">
          Fertig
        </a>
      </header>

      {e.gesperrt ? (
        <div class="besuch-zeile">
          <div class="besuch-text">
            <b>{e.stand}</b>
            <span>
              {e.markt}
              {e.stadt ? ` · ${e.stadt}` : ''}
            </span>
          </div>
          <button type="button" class="besuch-aus" onClick={() => setE({ ...e, gesperrt: false, besuchId: undefined })}>
            Anderer Stand
          </button>
        </div>
      ) : (
      <div class="stamm" style={{ position: 'relative' }}>
        {standFokus && vorschlaege.length > 0 && (
          <ul class="vorschlaege" role="listbox" aria-label="Meintest du einen dieser Stände?">
            {vorschlaege.map((v) => (
              <li role="option">
                <button type="button" onPointerDown={(ev) => { ev.preventDefault(); uebernimm(v); }}>
                  <span class="vs-name">{v.stand}</span>
                  <span class="vs-ort">{ortTeile(MARKTLISTE, v).join(' · ') || v.markt}</span>
                  <span class="vs-zahl">{v.anzahl}×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={standRef}
          class="feld"
          type="text"
          placeholder="Stand"
          aria-label="Stand"
          aria-invalid={fehlt && !e.stand.trim()}
          autocomplete="off"
          autocapitalize="words"
          enterkeyhint="done"
          value={e.stand}
          onInput={(ev) => setE({ ...e, stand: (ev.target as HTMLInputElement).value })}
          onFocus={() => setStandFokus(true)}
          onBlur={() => setTimeout(() => setStandFokus(false), 120)}
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
        />
        <button type="button" class={`ort-knopf${e.stadt ? '' : ' leer-ort'}`} onClick={() => setOrtOffen(true)} aria-label="Ort wählen: Stadt und Markt">
          <span class="ort-symbol">
            <Symbol name="pin" groesse={20} />
          </span>
          <span class="ort-text">
            {e.stadt ? (
              <>
                <b>{e.stadt}</b>
                <small>{e.markt !== MARKTLISTE.sonstiger ? e.markt : 'Markt wählen (optional)'}</small>
              </>
            ) : (
              <>
                <b>Wo bist du?</b>
                <small>Stadt suchen oder Standort nutzen</small>
              </>
            )}
          </span>
          <span class="ort-pfeil">
            <Symbol name="pfeil" groesse={18} />
          </span>
        </button>
      </div>
      )}

      {notizOffen ? (
        <div class="notizzeile">
          <input
            class="feld"
            type="text"
            placeholder="Notiz"
            aria-label="Notiz"
            autoFocus
            enterkeyhint="done"
            value={e.notiz}
            onInput={(ev) => setE({ ...e, notiz: (ev.target as HTMLInputElement).value })}
            onKeyDown={(ev) => ev.key === 'Enter' && setNotizOffen(false)}
          />
          <button type="button" onClick={() => setNotizOffen(false)}>
            OK
          </button>
        </div>
      ) : (
        <div class="meta">
          <select
            class={e.sorte ? 'chip gesetzt' : 'chip'}
            aria-label="Sorte"
            value={e.sorte ?? ''}
            onChange={(ev) => setE({ ...e, sorte: ((ev.target as HTMLSelectElement).value || undefined) as Sorte })}
          >
            <option value="">Sorte</option>
            {SORTEN.map((s) => (
              <option value={s}>{SORTE_LABEL[s]}</option>
            ))}
          </select>
          <select
            class={becherNr !== undefined ? 'chip gesetzt' : 'chip'}
            aria-label="Becher-Nr. des Abends"
            value={becherNr ?? ''}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setBecherNrAngefasst(true);
              setE({ ...e, becherNr: v ? Number(v) : undefined });
            }}
          >
            <option value="">Nr. –</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option value={n}>Nr. {n}</option>
            ))}
          </select>
          <select
            class={e.preis !== undefined ? 'chip gesetzt' : 'chip'}
            aria-label="Preis"
            value={e.preis ?? ''}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setE({ ...e, preis: v ? Number(v) : undefined });
            }}
          >
            <option value="">Preis</option>
            {PREISE.map((p) => (
              <option value={p}>{euro(p)}</option>
            ))}
          </select>
          <button type="button" class={e.notiz.trim() ? 'chip gesetzt' : 'chip'} onClick={() => setNotizOffen(true)}>
            {e.notiz.trim() ? 'Notiz ✓' : 'Notiz'}
          </button>
          <label class={foto ? 'chip gesetzt' : 'chip'}>
            {foto ? 'Foto ✓' : 'Foto'}
            <input type="file" accept="image/*" capture="environment" aria-label="Foto" onChange={waehleFoto} />
          </label>
        </div>
      )}

      <section class="skalen" aria-label="Noten">
        {KRITERIEN.map((k) => (
          <Skala
            key={k}
            name={ANKER[k].label}
            gewicht={gewichte[k]}
            wert={e.noten[k]}
            aktiv={aktiv === k}
            onAktiv={() => setAktiv(k)}
            onInfo={() => setAktiv(k)}
            onWert={(n) => setNote(k, n)}
          />
        ))}
      </section>

      <section class="hinweis" aria-live="polite">
        <div class="zeilen">
          <div class="kriterium">
            {def.label}
            {def.zusatz ? ` · ${def.zusatz}` : ''}
            {e.noten[aktiv] === null ? ' · nicht bewertet' : ''}
          </div>
          {anker.map((a) => (
            <div class={anker.length === 1 ? 'zeile einzeln' : 'zeile'}>
              <span class="stufe">{a.stufe}</span>
              <span class="text">{a.text}</span>
            </div>
          ))}
        </div>
        {e.noten[aktiv] !== null && (
          <button type="button" onClick={() => setNote(aktiv, null)}>
            Note löschen
          </button>
        )}
      </section>

      <footer class="fuss">
        <div class="messwert" aria-live="polite">
          <span class="kopfzeile">
            <span class={wertung.gesamt === null ? 'gesamt leer' : 'gesamt'}>{zahl2(wertung.gesamt)}</span>
            <span class="urteil">{wertung.urteil ?? `${bewertet}/7`}</span>
          </span>
          <span class="unter">Glühwein&nbsp;{zahl2(wertung.gluehwein)}</span>
          <span class="unter">Drumherum&nbsp;{zahl2(wertung.drumherum)}</span>
        </div>
        <button
          type="button"
          class={gespeichert ? 'speichern ok' : 'speichern'}
          disabled={bewertet === 0 && !gespeichert}
          onClick={speichern}
        >
          {fehlt && !e.stand.trim() ? 'Stand fehlt' : knopfText}
        </button>
      </footer>
    </main>
    {ortOffen && (
      <OrtBlatt
        start={{ stadt: e.stadt, markt: e.markt }}
        bestand={bestand}
        onWahl={waehleOrt}
        onZu={() => setOrtOffen(false)}
      />
    )}
    {fertigId && <TicketBlatt id={fertigId} onNaechster={() => setFertigId(null)} />}
    </>
  );
}
