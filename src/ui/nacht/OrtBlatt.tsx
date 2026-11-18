// Ortswahl als Blatt: erst die Stadt (Suche mit Vorschlägen, zuletzt gewählt, beliebt, in der Nähe), dann optional der Markt.
// Städte aus Deutschland und Österreich (GeoNames); was nicht dabei ist, lässt sich frei eintippen.
import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useOrte } from '../../daten/orte';
import { leseZuletzt } from '../../daten/zuletzt';
import {
  beliebteStaedte,
  maerkteIn,
  naechsteOrte,
  schluessel,
  sucheOrte,
  type MarktAuswahl,
} from '../../lib/ortssuche';
import { MARKTLISTE } from '../stammdaten';
import { Symbol } from '../Symbol';

interface Props {
  /** Aktuelle Auswahl des Entwurfs; mit Stadt öffnet das Blatt gleich bei der Marktwahl. */
  start: { stadt?: string; markt?: string };
  /** Alle Becher dieses Geräts (auch die der Community): Quelle für beliebte Städte und genutzte Märkte. */
  bestand: readonly { markt: string; stadt?: string }[];
  /** Stadt und Markt („Sonstiger", wenn kein Markt gewählt wurde). */
  onWahl: (stadt: string, markt: string) => void;
  onZu: () => void;
}

interface Eintrag {
  id: string;
  symbol: string;
  titel: string;
  unter?: string;
  rechts?: string;
  hervor?: boolean;
  /** Passenden Teil des Titels hervorheben (Suchergebnisse). */
  markieren?: boolean;
  wahl: () => void;
}

/** Hebt den Teil des Namens hervor, der zur Eingabe passt (nur wenn sich die Länge beim Vereinfachen nicht ändert). */
function markiere(name: string, eingabe: string): ComponentChildren {
  const falte = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const n = falte(name);
  const q = falte(eingabe.trim());
  const i = q ? n.indexOf(q) : -1;
  if (i < 0 || n.length !== name.length) return name;
  return (
    <>
      {name.slice(0, i)}
      <b class="text-gold-300">{name.slice(i, i + q.length)}</b>
      {name.slice(i + q.length)}
    </>
  );
}

function Zeile({ e, aktiv, onHover, q }: { e: Eintrag; aktiv: boolean; onHover: () => void; q: string }) {
  return (
    <li role="option" aria-selected={aktiv}>
      <button
        type="button"
        onClick={e.wahl}
        onPointerEnter={onHover}
        class={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3.5 py-2 text-left transition-colors ${aktiv ? 'bg-flaeche-hover' : ''} ${
          e.hervor ? 'text-gold-300' : 'text-eis'
        }`}
      >
        <span class="grid size-9 shrink-0 place-items-center rounded-full border border-rand bg-flaeche text-dunst">
          <Symbol name={e.symbol} groesse={18} />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[17px] font-semibold leading-tight">{e.markieren ? markiere(e.titel, q) : e.titel}</span>
          {e.unter && <span class="block truncate text-[13px] text-dunst">{e.unter}</span>}
        </span>
        {e.rechts && <span class="shrink-0 font-mono text-xs text-dunst">{e.rechts}</span>}
      </button>
    </li>
  );
}

function Abschnitt({ titel, kinder }: { titel: string; kinder: ComponentChildren }) {
  return (
    <section class="mt-2">
      <h3 class="etikett px-3.5 pb-1 pt-2 !text-[10.5px]">{titel}</h3>
      {kinder}
    </section>
  );
}

export function OrtBlatt({ start, bestand, onWahl, onZu }: Props) {
  const orte = useOrte();
  const [stadt, setStadt] = useState<string | null>(start.stadt?.trim() || null);
  const [q, setQ] = useState('');
  const [aktiv, setAktiv] = useState(0);
  const [naehe, setNaehe] = useState<{ stand: 'idle' | 'sucht' | 'fehler'; meldung?: string; orte?: { name: string; land: string; km: number }[] }>({ stand: 'idle' });
  const eingabe = useRef<HTMLInputElement>(null);
  const zuletzt = useMemo(leseZuletzt, []);

  useEffect(() => {
    eingabe.current?.focus();
  }, [stadt]);
  useEffect(() => setAktiv(0), [q, stadt, naehe.orte]);
  // Esc schließt, der Hintergrund dahinter scrollt nicht mit
  useEffect(() => {
    const taste = (ev: KeyboardEvent) => ev.key === 'Escape' && onZu();
    addEventListener('keydown', taste);
    const alt = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', taste);
      document.body.style.overflow = alt;
    };
  }, [onZu]);

  const becherJeStadt = useMemo(() => new Map(beliebteStaedte(bestand, MARKTLISTE, 999).map((b) => [schluessel(b.stadt), b.becher])), [bestand]);
  const markt = useMemo(() => (stadt ? maerkteIn(bestand, MARKTLISTE, stadt) : []), [stadt, bestand]);

  /** Stadt gewählt: gibt es Märkte zur Auswahl, geht es weiter, sonst ist die Wahl fertig. */
  const waehleStadt = (s: string) => {
    if (maerkteIn(bestand, MARKTLISTE, s).length === 0) return onWahl(s, MARKTLISTE.sonstiger);
    setStadt(s);
    setQ('');
  };

  const suchePosition = () => {
    if (!navigator.geolocation) return setNaehe({ stand: 'fehler', meldung: 'Dein Gerät kann den Standort nicht bestimmen.' });
    setNaehe({ stand: 'sucht' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // Der Standort bleibt auf dem Gerät: Es wird nur die nächste Stadt gesucht.
        const n = naechsteOrte(orte ?? [], p.coords.latitude, p.coords.longitude, 5).map((o) => ({ name: o.name, land: o.land, km: o.km }));
        setNaehe(n.length ? { stand: 'idle', orte: n } : { stand: 'fehler', meldung: 'Keine Stadt in der Nähe gefunden.' });
      },
      (f) => setNaehe({ stand: 'fehler', meldung: f.code === 1 ? 'Standort nicht erlaubt. Such die Stadt einfach oben.' : 'Standort gerade nicht verfügbar.' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  // ───────── Einträge je Schritt ─────────
  const eintraege: { titel?: string; liste: Eintrag[] }[] = [];
  const qk = q.trim();

  if (stadt === null) {
    if (!qk) {
      const nahe: Eintrag[] = [];
      if (naehe.orte) {
        for (const o of naehe.orte) {
          nahe.push({ id: `n-${o.name}`, symbol: 'ziel', titel: o.name, unter: o.land, rechts: o.km < 1 ? 'hier' : `${Math.round(o.km)} km`, wahl: () => waehleStadt(o.name) });
        }
      } else {
        nahe.push({
          id: 'nahe',
          symbol: 'ziel',
          titel: naehe.stand === 'sucht' ? 'Suche deinen Standort …' : 'In meiner Nähe suchen',
          unter: naehe.meldung ?? 'Der Standort bleibt auf deinem Gerät.',
          hervor: true,
          wahl: suchePosition,
        });
      }
      eintraege.push({ liste: nahe });
      if (zuletzt.length)
        eintraege.push({
          titel: 'Zuletzt',
          liste: zuletzt.map((z) => ({
            id: `z-${z.stadt}-${z.markt ?? ''}`,
            symbol: 'uhr',
            titel: z.stadt,
            unter: z.markt,
            wahl: () => onWahl(z.stadt, z.markt ?? MARKTLISTE.sonstiger),
          })),
        });
      const beliebt = beliebteStaedte(bestand, MARKTLISTE, 6).filter((b) => !zuletzt.some((z) => z.stadt === b.stadt && !z.markt));
      if (beliebt.length)
        eintraege.push({
          titel: 'Schon bewertet',
          liste: beliebt.map((b) => ({ id: `b-${b.stadt}`, symbol: 'pin', titel: b.stadt, rechts: `${b.becher} Becher`, wahl: () => waehleStadt(b.stadt) })),
        });
    } else {
      const treffer = sucheOrte(orte ?? [], qk, 8);
      const liste: Eintrag[] = treffer.map((o) => ({
        id: `o-${o.name}-${o.land}`,
        symbol: 'pin',
        titel: o.name,
        unter: o.land,
        rechts: becherJeStadt.get(o.key) ? `${becherJeStadt.get(o.key)} Becher` : undefined,
        markieren: true,
        wahl: () => waehleStadt(o.name),
      }));
      // Nur anbieten, wenn kein Treffer so beginnt: Wer „traunst" tippt, will Traunstein und keine eigene Stadt
      const beginnt = treffer.some((o) => o.key.startsWith(schluessel(qk)));
      if (!beginnt && schluessel(qk).length >= 2)
        liste.push({ id: 'neu', symbol: 'haken', titel: `„${qk}" verwenden`, unter: 'Stadt, die in der Liste fehlt', hervor: true, wahl: () => waehleStadt(qk.replace(/\s+/g, ' ')) });
      eintraege.push({ liste });
    }
  } else {
    const k = schluessel(qk);
    const gefiltert: MarktAuswahl[] = k ? markt.filter((m) => schluessel(m.markt).includes(k)) : markt;
    const liste: Eintrag[] = gefiltert.map((m) => ({
      id: `m-${m.markt}`,
      symbol: 'pin',
      titel: m.markt,
      unter: m.gepflegt ? undefined : 'von anderen eingetragen',
      markieren: true,
      rechts: m.becher ? `${m.becher} Becher` : undefined,
      hervor: start.stadt === stadt && start.markt === m.markt,
      wahl: () => onWahl(stadt, m.markt),
    }));
    if (qk && !markt.some((m) => schluessel(m.markt) === k))
      liste.push({ id: 'neu', symbol: 'haken', titel: `„${qk}" verwenden`, unter: `Markt in ${stadt}`, hervor: true, wahl: () => onWahl(stadt, qk.replace(/\s+/g, ' ')) });
    eintraege.push({ liste });
  }

  const flach = eintraege.flatMap((a) => a.liste);
  const gehe = (d: number) => setAktiv((i) => Math.min(Math.max(i + d, 0), Math.max(flach.length - 1, 0)));
  const taste = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown') (ev.preventDefault(), gehe(1));
    else if (ev.key === 'ArrowUp') (ev.preventDefault(), gehe(-1));
    else if (ev.key === 'Enter' && flach[aktiv]) (ev.preventDefault(), flach[aktiv].wahl());
  };
  let nr = -1;

  return (
    <div class="nm fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ort wählen"
        class="glas-stark flex h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] text-eis sm:h-[min(700px,88dvh)] sm:rounded-[28px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header class="px-4 pb-3 pt-4">
          <div class="flex items-center gap-3">
            <h2 class="flex-1 font-display text-[28px] uppercase leading-none tracking-wide">{stadt === null ? 'Wo bist du?' : 'Welcher Markt?'}</h2>
            <button type="button" onClick={onZu} aria-label="Schließen" class="grid size-10 place-items-center rounded-full border border-rand bg-flaeche text-dunst hover:text-eis">
              <Symbol name="schliessen" groesse={20} />
            </button>
          </div>
          {stadt !== null && (
            <button
              type="button"
              onClick={() => (setStadt(null), setQ(''))}
              class="mt-3 inline-flex items-center gap-2 rounded-full border border-rand bg-flaeche px-3.5 py-1.5 text-sm font-semibold text-gold-300"
              aria-label={`Stadt ${stadt} ändern`}
            >
              <Symbol name="pin" groesse={15} />
              {stadt}
              <span class="text-dunst">ändern</span>
            </button>
          )}
          <label class="relative mt-3 block">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dunst">
              <Symbol name="lupe" groesse={20} />
            </span>
            <input
              ref={eingabe}
              type="search"
              inputMode="search"
              enterkeyhint="go"
              autocomplete="off"
              autocapitalize="words"
              spellcheck={false}
              role="combobox"
              aria-expanded="true"
              aria-controls="ort-liste"
              placeholder={stadt === null ? 'Stadt suchen, z. B. Salzburg' : "Markt suchen oder eintippen"}
              value={q}
              onInput={(ev) => setQ((ev.target as HTMLInputElement).value)}
              onKeyDown={taste}
              class="h-14 w-full rounded-2xl border border-[var(--nm-rand-stark)] bg-flaeche pl-12 pr-4 text-[18px] text-eis outline-none placeholder:text-dunst focus:border-[var(--nm-akzent)] focus:shadow-[0_0_0_3px_rgb(255_138_61/0.25)]"
            />
          </label>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-3" id="ort-liste" role="listbox">
          {stadt === null && qk && !orte && <p class="px-4 py-6 text-center text-dunst">Lade Städte …</p>}
          {eintraege.map((a) => (
            <Fragment key={a.titel ?? 'x'}>
              {a.titel ? (
                <Abschnitt
                  titel={a.titel}
                  kinder={
                    <ul>
                      {a.liste.map((e) => {
                        nr++;
                        const mein = nr;
                        return <Zeile key={e.id} e={e} q={qk} aktiv={aktiv === mein} onHover={() => setAktiv(mein)} />;
                      })}
                    </ul>
                  }
                />
              ) : (
                <ul class="mt-1">
                  {a.liste.map((e) => {
                    nr++;
                    const mein = nr;
                    return <Zeile key={e.id} e={e} q={qk} aktiv={aktiv === mein} onHover={() => setAktiv(mein)} />;
                  })}
                </ul>
              )}
            </Fragment>
          ))}
          {orte && flach.length === 0 && <p class="px-4 py-6 text-center text-dunst">Nichts gefunden.</p>}
        </div>

        {stadt !== null && (
          <footer class="border-t border-rand px-4 py-3">
            <button
              type="button"
              onClick={() => onWahl(stadt, MARKTLISTE.sonstiger)}
              class="w-full rounded-2xl border border-rand bg-flaeche py-3.5 text-[16px] font-semibold text-eis hover:bg-flaeche-hover"
            >
              Ohne Markt weiter
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
