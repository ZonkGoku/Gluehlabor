// Der Erfassungsscreen. Eine Ansicht, sieben Skalen, kein Scrollen.
// Keine Rechenlogik hier: Wertung, Anker, Becher-Nr. kommen aus src/lib.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import ankerJson from '../../data/anker.json';
import maerkteJson from '../../data/maerkte.json';
import { db, leseEinstellung, leseGewichte, schreibeEinstellung, speichereNeuenEintrag } from '../daten/db';
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
import { ankerFuer, type AnkerDaten } from '../lib/anker';
import { euro, probeNr, zahl2 } from '../lib/format';
import { DEFAULT_GEWICHTE, KRITERIEN, leereNoten, SORTEN, type Eintrag, type Kriterium, type Sorte } from '../lib/modell';
import { bewerte } from '../lib/scoring';
import { useLive } from './hooks';
import { Skala } from './Skala';
import { SyncAnzeige } from './SyncAnzeige';

const ANKER = ankerJson as unknown as AnkerDaten;
const MAERKTE = maerkteJson as string[];

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

function leererEntwurf(markt: string, sorte?: Sorte): Entwurf {
  return { stand: '', markt, marktFrei: false, sorte, notiz: '', noten: leereNoten() };
}

export function Erfassen() {
  const gewichte = useLive(leseGewichte, [], { ...DEFAULT_GEWICHTE });
  const anzahl = useLive(() => db.eintraege.count(), [], 0);
  const heute = abendDatum(new Date());
  const heutige = useLive(() => db.eintraege.where('datum').equals(heute).toArray(), [heute], []);

  const [e, setE] = useState<Entwurf>(() => leseEntwurf() ?? leererEntwurf(MAERKTE[0]));
  const [becherNrAngefasst, setBecherNrAngefasst] = useState(() => leseEntwurf()?.becherNr !== undefined);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [aktiv, setAktiv] = useState<Kriterium>('geschmack');
  const [notizOffen, setNotizOffen] = useState(false);
  const [fehlt, setFehlt] = useState(false);
  const [gespeichert, setGespeichert] = useState<string | null>(null);
  const standRef = useRef<HTMLInputElement>(null);

  // Beim ersten Öffnen ohne Entwurf: zuletzt benutzten Markt vorschlagen.
  useEffect(() => {
    if (leseEntwurf()) return;
    void leseEinstellung<string>('letzterMarkt', '').then((m) => {
      if (m) setE((x) => ({ ...x, markt: m, marktFrei: !MAERKTE.includes(m) }));
    });
  }, []);
  useEffect(() => {
    void leseEntwurfFoto().then(setFoto);
  }, []);

  // Entwurf bei jeder Änderung sichern.
  useEffect(() => schreibeEntwurf(e), [e]);

  // Becher-Nr. vorschlagen, solange niemand sie selbst gewählt hat.
  const vorschlagNr = naechsteBecherNr(heutige, heute);
  const becherNr = becherNrAngefasst ? e.becherNr : vorschlagNr;

  const wertung = useMemo(() => bewerte(e.noten, gewichte), [e.noten, gewichte]);
  const bewertet = KRITERIEN.filter((k) => e.noten[k] !== null).length;

  const setNote = (k: Kriterium, n: number | null) => setE((x) => ({ ...x, noten: { ...x.noten, [k]: n } }));

  const waehleFoto = async (ev: Event) => {
    const datei = (ev.target as HTMLInputElement).files?.[0];
    if (!datei) return;
    const klein = await verkleinereFoto(datei);
    setFoto(klein);
    await schreibeEntwurfFoto(klein);
  };

  const speichern = async () => {
    const stand = e.stand.trim();
    if (!stand) {
      setFehlt(true);
      standRef.current?.focus();
      return;
    }
    const jetzt = new Date();
    const eintrag: Eintrag = {
      id: neueId(),
      stand,
      markt: e.markt.trim() || 'Sonstiger',
      saison: jetzt.getFullYear(),
      datum: abendDatum(jetzt),
      noten: { ...e.noten },
      erstelltAm: jetzt.getTime(),
    };
    if (e.sorte) eintrag.sorte = e.sorte;
    if (becherNr !== undefined) eintrag.becherNr = becherNr;
    if (e.preis !== undefined) eintrag.preis = e.preis;
    if (e.notiz.trim()) eintrag.notiz = e.notiz.trim();

    await speichereNeuenEintrag(eintrag, foto ?? undefined);
    // Ab hier ist der Becher sicher auf dem Gerät.
    await schreibeEinstellung('letzterMarkt', eintrag.markt);
    await schreibeEntwurfFoto(null);
    const neu = { ...leererEntwurf(eintrag.markt, e.sorte), marktFrei: e.marktFrei };
    setE(neu);
    setBecherNrAngefasst(false);
    setFoto(null);
    setNotizOffen(false);
    setFehlt(false);
    setAktiv('geschmack');
    setGespeichert(`Probe ${probeNr(anzahl + 1)} gesichert`);
    navigator.vibrate?.([20, 40, 20]);
    setTimeout(() => setGespeichert(null), 2200);
    void synchronisiere();
  };

  const def = ANKER[aktiv];
  const anker = ankerFuer(def, e.noten[aktiv]);
  const knopfText = gespeichert ?? (bewertet === 0 ? 'Noch keine Note' : 'Speichern');

  return (
    <main class="erf">
      <header class="kopf">
        <span class="marke">Becherwerk</span>
        <span class="titel" />
        <SyncAnzeige />
        <a href="#/einstellungen" aria-label="Einstellungen">
          Menü
        </a>
      </header>

      <div class="stamm">
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
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
        />
        {e.marktFrei ? (
          <input
            class="feld"
            type="text"
            placeholder="Markt"
            aria-label="Markt (frei)"
            value={e.markt}
            onInput={(ev) => setE({ ...e, markt: (ev.target as HTMLInputElement).value })}
            onBlur={() => !e.markt.trim() && setE({ ...e, markt: MAERKTE[0], marktFrei: false })}
          />
        ) : (
          <select
            class="feld"
            aria-label="Markt"
            value={e.markt}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setE(v === '__frei' ? { ...e, markt: '', marktFrei: true } : { ...e, markt: v });
            }}
          >
            {MAERKTE.map((m) => (
              <option value={m}>{m}</option>
            ))}
            <option value="__frei">Anderer Markt …</option>
          </select>
        )}
      </div>

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
  );
}
