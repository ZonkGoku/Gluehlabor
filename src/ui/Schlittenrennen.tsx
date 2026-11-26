// Schlittenrennen (Beta): eigene Rennen mit Freunden, jedes Gerät hat seinen Schlitten. Die Rechnung steht in lib/rennen.ts.
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../daten/config';
import { ApiFehler } from '../daten/api';
import { legeRennenAn, ladeRennen, letztesKamel, merkeKamel, meineRennen, trittBei, vergissRennen, type RennenDaten } from '../daten/rennen';
import { t, tn } from '../i18n';
import { berechneRennen, SCHLITTEN_FARBEN, RENNEN_ID, RENNEN_ZIELE, rennenLink, type Bahn } from '../lib/rennen';
import { Betreiber } from './bausteine';
import { useEintraege, useGeraetId, useName } from './daten';
import { useLive } from './hooks';
import { Qr } from './Qr';

// ───────── Bahn ─────────
const B = 360;
const X0 = 22; // Startlinie
const X1 = 306; // Ziellinie
const KAMEL_B = 40;
const OBEN = 22;

/** Schlitten von der Seite, nach rechts fahrend, mit kleiner Figur. 42 × 32 Einheiten. */
function SchlittenBild({ farbe }: { farbe: string }) {
  return (
    <g fill={farbe} stroke={farbe} stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 28h30c4 0 6-3 5-7" stroke-width="2.6" fill="none" />
      <path d="M11 28v-6M27 28v-6" stroke-width="2.2" fill="none" />
      <path d="M6 12c5-1 7 1 8 3h20l-3 8H9c0-5-1-8-3-11z" stroke-width="1" />
      <path d="M12 15c1-5 5-6 9-5" stroke-width="2" fill="none" />
      <circle cx="30" cy="11" r="3" stroke="none" />
    </g>
  );
}

function Rennbahn({ bahnen, ich }: { bahnen: Bahn[]; ich: string | null }) {
  const [bereit, setBereit] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setBereit(true));
    return () => cancelAnimationFrame(f);
  }, []);
  const bahnH = bahnen.length > 6 ? 46 : 58;
  const hoehe = OBEN + bahnH * bahnen.length + 24;
  return (
    <section class="glas rahmen-licht overflow-hidden rounded-3xl p-3" aria-label={t('Rennbahn')}>
      <svg viewBox={`0 0 ${B} ${hoehe}`} class="block h-auto w-full" role="img" aria-label={t('Rennbahn mit den Schlitten')}>
        {bahnen.map((b, i) => {
          const y = OBEN + i * bahnH;
          const x = X0 + b.anteil * (X1 - X0 - KAMEL_B);
          return (
            <g>
              <rect x={X0 - 10} y={y + 3} width={X1 - X0 + 34} height={bahnH - 6} rx="14" fill="currentColor" opacity="0.07" />
              <path d={`M${X0} ${y + bahnH - 11}H${X1 + 10}`} stroke="currentColor" opacity="0.25" stroke-dasharray="3 6" stroke-linecap="round" fill="none" />
              <text x={X0 - 6} y={y + 15} font-size="11" fill="currentColor" opacity={b.geraet === ich ? 1 : 0.7} font-family="var(--mono)" font-weight={b.geraet === ich ? 700 : 400}>
                {b.platz}. {b.kamel}
              </text>
              <g class="kamel-lauf" style={{ transform: `translate(${bereit ? x : X0}px, ${y + (bahnH > 50 ? 15 : 10)}px)` }}>
                <g class={b.platz === 1 && b.schritte > 0 ? 'kamel-wippen' : ''}>
                  <g transform={bahnH > 50 ? 'scale(1.15)' : 'scale(0.95)'}>
                    <SchlittenBild farbe={SCHLITTEN_FARBEN[b.farbe % SCHLITTEN_FARBEN.length]} />
                  </g>
                </g>
              </g>
            </g>
          );
        })}
        {/* Ziel: Zielflagge aus zwei Reihen Karos */}
        <g aria-hidden="true">
          {Array.from({ length: Math.floor((bahnH * bahnen.length) / 8) }, (_, r) =>
            [0, 1].map((c) => <rect x={X1 + 14 + c * 8} y={OBEN + r * 8} width="8" height="8" fill={(r + c) % 2 ? '#ffc857' : '#1a1020'} />),
          )}
        </g>
        <text x={X0} y={hoehe - 7} font-size="11" fill="currentColor" opacity="0.75">
          {t('Start')}
        </text>
        <text x={B - 6} y={hoehe - 7} font-size="11" text-anchor="end" fill="#ffc857">
          {t('Ziel')}
        </text>
      </svg>
    </section>
  );
}

// ───────── Kamel wählen (Name und Farbe) ─────────
function KamelWahl({ name, farbe, onName, onFarbe }: { name: string; farbe: number; onName: (n: string) => void; onFarbe: (f: number) => void }) {
  return (
    <div class="grid gap-3">
      <label class="grid gap-1.5 text-[15px] text-dunst">
        {t('Name deines Schlittens')}
        <input
          class="feld min-h-[48px] text-[17px]"
          type="text"
          maxLength={24}
          value={name}
          onInput={(e) => onName((e.target as HTMLInputElement).value)}
          autocomplete="off"
        />
      </label>
      <div role="radiogroup" aria-label={t('Farbe')} class="flex flex-wrap gap-2">
        {SCHLITTEN_FARBEN.map((f, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={farbe === i}
            aria-label={t('Farbe {n}', { n: i + 1 })}
            onClick={() => onFarbe(i)}
            class="size-11 rounded-full border-2 transition"
            style={{ background: f, borderColor: farbe === i ? 'var(--nm-text, #fff)' : 'transparent', outline: farbe === i ? '2px solid var(--nm-stern)' : 'none', outlineOffset: '2px' }}
          />
        ))}
      </div>
    </div>
  );
}

function useKamelWahl() {
  const standard = useName();
  const [name, setName] = useState('');
  const [farbe, setFarbe] = useState(0);
  useEffect(() => {
    void letztesKamel().then((k) => {
      if (k) {
        setName(k.name);
        setFarbe(k.farbe);
      }
    });
  }, []);
  useEffect(() => setName((n) => n || standard), [standard]);
  return { name, setName, farbe, setFarbe };
}

const fehlerText = (e: unknown) => (e instanceof ApiFehler ? t(e.message) : t('Keine Verbindung. Bitte später erneut versuchen.'));

const knopf = 'flex min-h-[56px] w-full items-center justify-center rounded-full px-6 text-[17px] font-bold text-[#1a1020] no-underline disabled:opacity-50';
const KNOPF_STIL = { background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' };

function Kopf({ titel, text }: { titel: string; text?: string }) {
  return (
    <div class="mb-5 mt-2">
      <p class="etikett inline-flex items-center gap-2 !text-gold-300">
        <span class="rounded-full border border-gold-300 px-2 py-0.5">{t('Beta')}</span>
        <span>{t('Schlittenrennen')}</span>
      </p>
      <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{titel}</h1>
      {text && <p class="mt-3 max-w-prose text-[17px] leading-snug text-dunst">{text}</p>}
    </div>
  );
}

const HINWEIS = 'Beta: Wir probieren das gerade aus. Ab 18. Pro Stand und Abend zählt nur eine Bewertung, es geht nicht ums Trinken.';

// ───────── Übersicht: meine Rennen, neues Rennen ─────────
export function SchlittenrennenUebersicht() {
  const ids = useLive(meineRennen, [], [] as string[]);
  const [daten, setDaten] = useState<Record<string, RennenDaten | null>>({});
  const [neu, setNeu] = useState(false);
  const [code, setCode] = useState('');
  const alle = useEintraege();
  const ich = useGeraetId();
  useEffect(() => {
    let aktiv = true;
    for (const id of ids) {
      ladeRennen(id)
        .then((d) => aktiv && setDaten((x) => ({ ...x, [id]: d })))
        .catch((e) => aktiv && e instanceof ApiFehler && e.status === 404 && setDaten((x) => ({ ...x, [id]: null })));
    }
    return () => {
      aktiv = false;
    };
  }, [ids.join(',')]);

  return (
    <div class="nm karawane">
      <Kopf titel={t('Schlittenrennen')} text={t('Rennen mit Freunden: Jeder hat seinen Schlitten, jede Bewertung ist ein Schritt.')} />
      {!HAT_SERVER && <p class="glas mb-4 rounded-2xl p-4 text-dunst">{t('Rennen brauchen eine Verbindung zum Server. Hier läuft die App nur lokal.')}</p>}

      {ids.length > 0 && (
        <ul class="m-0 mb-4 grid list-none gap-2 p-0" aria-label={t('Deine Rennen')}>
          {ids.map((id) => {
            const d = daten[id];
            if (d === null) return null;
            const stand = d && alle ? berechneRennen(d.rennen, d.teilnehmer, alle) : null;
            const meine = stand?.bahnen.find((b) => b.geraet === ich);
            return (
              <li>
                <a href={`#/schlittenrennen/${id}`} class="glas flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-eis no-underline">
                  <span class="min-w-0 flex-1">
                    <b class="block truncate text-[17px]">{d ? d.rennen.name : '…'}</b>
                    <span class="block text-sm text-dunst">
                      {d && stand
                        ? stand.vorbei
                          ? t('Vorbei')
                          : tn(stand.tageUebrig, 'Noch {n} Tag', 'Noch {n} Tage')
                        : ''}
                      {d && ` · ${tn(d.teilnehmer.length, '{n} Schlitten', '{n} Schlitten')}`}
                    </span>
                  </span>
                  {meine && <span class="font-display text-3xl text-gold-300">{meine.platz}.</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {neu ? (
        <NeuesRennen onZu={() => setNeu(false)} />
      ) : (
        <button type="button" class={knopf} style={KNOPF_STIL} disabled={!HAT_SERVER} onClick={() => setNeu(true)}>
          {t('Neues Rennen starten')}
        </button>
      )}

      <section class="glas mt-4 grid gap-2 rounded-2xl p-4">
        <label class="text-[15px] text-dunst" for="rennen-code">
          {t('Code von Freunden eingeben')}
        </label>
        <div class="flex gap-2">
          <input
            id="rennen-code"
            class="feld min-h-[48px] min-w-0 flex-1 font-mono text-[17px] uppercase"
            type="text"
            maxLength={8}
            value={code}
            autocomplete="off"
            autocapitalize="characters"
            onInput={(e) => setCode((e.target as HTMLInputElement).value.trim().toLowerCase())}
          />
          <a
            href={RENNEN_ID.test(code) ? `#/schlittenrennen/${code}` : undefined}
            aria-disabled={!RENNEN_ID.test(code)}
            class="grid min-h-[48px] place-items-center rounded-full border-2 border-[var(--nm-bedienung)] px-5 font-semibold text-eis no-underline aria-disabled:opacity-40"
          >
            {t('Los')}
          </a>
        </div>
      </section>
      <p class="mt-4 text-sm text-dunst">{t(HINWEIS)}</p>
      <Betreiber />
    </div>
  );
}

function NeuesRennen({ onZu }: { onZu: () => void }) {
  const [rname, setRname] = useState('');
  const [ziel, setZiel] = useState<number>(20);
  const k = useKamelWahl();
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const ok = rname.trim().length >= 2 && k.name.trim().length >= 2;
  const los = async () => {
    setLaeuft(true);
    setFehler('');
    try {
      const id = await legeRennenAn(rname.trim(), ziel, k.name.trim(), k.farbe);
      await merkeKamel(k.name.trim(), k.farbe);
      location.hash = `#/schlittenrennen/${id}`;
    } catch (e) {
      setFehler(fehlerText(e));
      setLaeuft(false);
    }
  };
  const LABEL: Record<number, string> = { 10: 'Kurz', 20: 'Mittel', 30: 'Lang' };
  return (
    <section class="glas grid gap-4 rounded-3xl p-4" aria-label={t('Neues Rennen')}>
      <label class="grid gap-1.5 text-[15px] text-dunst">
        {t('Name des Rennens')}
        <input class="feld min-h-[48px] text-[17px]" type="text" maxLength={24} value={rname} onInput={(e) => setRname((e.target as HTMLInputElement).value)} autocomplete="off" />
      </label>
      <div>
        <p class="mb-1.5 text-[15px] text-dunst">{t('Länge')}</p>
        <div role="radiogroup" aria-label={t('Länge')} class="grid grid-cols-3 gap-2">
          {RENNEN_ZIELE.map((z) => (
            <button
              type="button"
              role="radio"
              aria-checked={ziel === z}
              onClick={() => setZiel(z)}
              class={`min-h-[56px] rounded-2xl border-2 px-2 text-center ${ziel === z ? 'border-[var(--nm-stern)] bg-flaeche text-eis' : 'border-[var(--nm-bedienung)] text-dunst'}`}
            >
              <b class="block text-[16px]">{t(LABEL[z])}</b>
              <span class="block text-xs">{tn(z, '{n} Schritt', '{n} Schritte')}</span>
            </button>
          ))}
        </div>
      </div>
      <KamelWahl name={k.name} farbe={k.farbe} onName={k.setName} onFarbe={k.setFarbe} />
      {fehler && <p role="alert" class="m-0 text-[15px] text-[var(--warnung)]">{fehler}</p>}
      <div class="grid gap-2">
        <button type="button" class={knopf} style={KNOPF_STIL} disabled={!ok || laeuft} onClick={() => void los()}>
          {t('Rennen starten')}
        </button>
        <button type="button" class="min-h-[48px] rounded-full text-dunst" onClick={onZu}>
          {t('Abbrechen')}
        </button>
      </div>
    </section>
  );
}

// ───────── Ein Rennen ─────────
export function RennenSeite({ id }: { id: string }) {
  const [d, setD] = useState<RennenDaten | null>(null);
  const [fehler, setFehler] = useState('');
  const [nichtDa, setNichtDa] = useState(false);
  const alle = useEintraege();
  const ich = useGeraetId();
  const [neuLaden, setNeuLaden] = useState(0);

  useEffect(() => {
    if (!RENNEN_ID.test(id)) return setNichtDa(true);
    let aktiv = true;
    const hole = () =>
      ladeRennen(id)
        .then((x) => aktiv && (setD(x), setFehler('')))
        .catch((e) => {
          if (!aktiv) return;
          if (e instanceof ApiFehler && e.status === 404) setNichtDa(true);
          else setFehler(fehlerText(e));
        });
    void hole();
    const takt = setInterval(hole, 10_000);
    return () => {
      aktiv = false;
      clearInterval(takt);
    };
  }, [id, neuLaden]);

  if (nichtDa)
    return (
      <div class="nm karawane">
        <Kopf titel={t('Rennen nicht gefunden')} text={t('Vielleicht ist der Code falsch geschrieben.')} />
        <a href="#/schlittenrennen" class={knopf} style={KNOPF_STIL}>
          {t('Zu den Rennen')}
        </a>
        <p class="mt-4 text-center">
          <button type="button" class="min-h-[44px] text-dunst" onClick={() => void vergissRennen(id)}>
            {t('Aus meiner Liste entfernen')}
          </button>
        </p>
      </div>
    );
  if (!d || !alle) return <div class="nm karawane">{fehler && <p class="glas rounded-2xl p-4 text-dunst">{fehler}</p>}</div>;

  const stand = berechneRennen(d.rennen, d.teilnehmer, alle);
  const dabei = d.teilnehmer.some((x) => x.geraet === ich);
  const link = rennenLink(location.href, id);
  const meine = stand.bahnen.find((b) => b.geraet === ich);

  return (
    <div class="nm karawane">
      <a href="#/schlittenrennen" class="mb-1 inline-block min-h-[44px] py-3 text-gold-300 no-underline">
        ‹ {t('Alle Rennen')}
      </a>
      <Kopf titel={d.rennen.name} text={stand.vorbei ? undefined : `${tn(d.rennen.ziel, '{n} Schritt bis ins Ziel', '{n} Schritte bis ins Ziel')} · ${tn(stand.tageUebrig, 'noch {n} Tag', 'noch {n} Tage')}`} />

      <Rennbahn bahnen={stand.bahnen} ich={ich} />

      {stand.vorbei && (
        <p class="mt-4 rounded-2xl border-2 border-[var(--nm-stern)] bg-flaeche p-4 text-center font-display text-2xl uppercase tracking-wide text-eis">
          {stand.sieger ? t('{kamel} ist im Ziel!', { kamel: stand.sieger.kamel }) : t('Das Rennen ist vorbei.')}
        </p>
      )}

      <ol class="m-0 mt-4 grid list-none gap-2 p-0" aria-label={t('Stand des Rennens')}>
        {stand.bahnen.map((b) => (
          <li class="glas flex min-h-[56px] items-center gap-3 rounded-2xl px-4 py-2">
            <span class="grid size-8 shrink-0 place-items-center rounded-full font-display text-lg text-[#1a1020]" style={{ background: SCHLITTEN_FARBEN[b.farbe % SCHLITTEN_FARBEN.length] }}>
              {b.platz}
            </span>
            <b class="min-w-0 flex-1 truncate text-[17px] text-eis">
              {b.kamel}
              {b.geraet === ich && <span class="ml-2 rounded-full border border-gold-300 px-2 py-0.5 text-xs font-normal text-gold-300">{t('du')}</span>}
            </b>
            <span class="font-mono text-sm text-dunst">
              {b.schritte}/{d.rennen.ziel}
            </span>
          </li>
        ))}
      </ol>

      {dabei ? (
        <>
          {!stand.vorbei && (
            <a href="#/erfassen" class={`${knopf} mt-5`} style={KNOPF_STIL}>
              {meine && meine.schritte === 0 ? t('Bewerten und losfahren') : t('Bewerten und weiterfahren')}
            </a>
          )}
          {!stand.vorbei && (
            <section class="glas mt-4 grid justify-items-center gap-3 rounded-3xl p-4 text-center">
              <p class="m-0 text-[17px] font-semibold text-eis">{t('Freunde einladen')}</p>
              <div class="qr-box">
                <Qr text={link} titel={t('QR-Code zum Rennen {name}', { name: d.rennen.name })} />
              </div>
              <p class="m-0 font-mono text-2xl tracking-[0.25em] text-gold-300">{id.toUpperCase()}</p>
              <TeilenKnopf link={link} name={d.rennen.name} />
            </section>
          )}
        </>
      ) : (
        <BeitrittsBlock id={id} voll={d.teilnehmer.length >= 12} vorbei={stand.vorbei} danach={() => setNeuLaden((n) => n + 1)} />
      )}
      {fehler && <p class="mt-3 text-sm text-dunst">{fehler}</p>}
      <p class="mt-4 text-sm text-dunst">{t(HINWEIS)}</p>
      <Betreiber />
    </div>
  );
}

function TeilenKnopf({ link, name }: { link: string; name: string }) {
  const [kopiert, setKopiert] = useState(false);
  const teile = async () => {
    try {
      if (navigator.share) return void (await navigator.share({ title: name, text: t('Fahr mit im Schlittenrennen: {name}', { name }), url: link }));
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      /* abgebrochen */
    }
  };
  return (
    <button type="button" class="min-h-[48px] rounded-full border-2 border-[var(--nm-bedienung)] px-6 font-semibold text-eis" onClick={() => void teile()}>
      {kopiert ? t('Link kopiert') : t('Link teilen')}
    </button>
  );
}

function BeitrittsBlock({ id, voll, vorbei, danach }: { id: string; voll: boolean; vorbei: boolean; danach: () => void }) {
  const k = useKamelWahl();
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  if (vorbei) return null;
  if (voll) return <p class="glas mt-5 rounded-2xl p-4 text-dunst">{t('Das Rennen ist voll.')}</p>;
  const ok = k.name.trim().length >= 2;
  const los = async () => {
    setLaeuft(true);
    setFehler('');
    try {
      await trittBei(id, k.name.trim(), k.farbe);
      await merkeKamel(k.name.trim(), k.farbe);
      danach();
    } catch (e) {
      setFehler(fehlerText(e));
    }
    setLaeuft(false);
  };
  return (
    <section class="glas mt-5 grid gap-4 rounded-3xl p-4" aria-label={t('Mitfahren')}>
      <p class="m-0 text-[17px] font-semibold text-eis">{t('Fahr mit! Such dir einen Schlitten aus.')}</p>
      <KamelWahl name={k.name} farbe={k.farbe} onName={k.setName} onFarbe={k.setFarbe} />
      {fehler && <p role="alert" class="m-0 text-[15px] text-[var(--warnung)]">{fehler}</p>}
      <button type="button" class={knopf} style={KNOPF_STIL} disabled={!ok || laeuft} onClick={() => void los()}>
        {t('Mitfahren')}
      </button>
      <p class="m-0 text-sm text-dunst">{t('Es zählen deine Bewertungen ab jetzt. Kein Konto nötig.')}</p>
    </section>
  );
}
