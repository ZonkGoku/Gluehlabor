// Schlittenfahren (Beta): ein Wochenrennen für alle und eigene Rennen mit Freunden, jedes Gerät hat seinen Schlitten.
// Die Rechnung steht in lib/rennen.ts, die Zeichnungen in schlitten/Bahn.tsx.
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../daten/config';
import { ApiFehler } from '../daten/api';
import {
  legeRennenAn,
  ladeRennen,
  letztesKamel,
  loescheRennen,
  merkeKamel,
  meineRennen,
  trittBei,
  verlasseRennen,
  vergissRennen,
  type RennenDaten,
} from '../daten/rennen';
import { t, tn } from '../i18n';
import { berechneRennen, lage, RENNEN_ID, RENNEN_MAX, RENNEN_MIN, RENNEN_ZIELE, rennenLink, sichtbareBahnen, SCHLITTEN_FARBEN } from '../lib/rennen';
import { Betreiber } from './bausteine';
import { useEintraege, useGeraetId, useName } from './daten';
import { useLive } from './hooks';
import { Qr } from './Qr';
import { teileRennenBild } from './nacht/rennenBild';
import { Konfetti, lageText, Rennbahn, Siegerpodest, farbeVon } from './schlitten/Bahn';
import { AvatarBild, FahrzeugBild } from './schlitten/FahrzeugBild';
import { KopfIcon } from './nacht/KopfIcon';
import { AVATARE } from '../lib/avatare';
import { zufallsname } from '../lib/zufallsname';
import { FAHRZEUGE } from '../lib/fahrzeuge';
import { fehlerText, useRennenDaten } from './schlitten/laden';
import { useGesicht } from './schlitten/gesicht';
import { loescheGesicht, setzeGesicht } from '../daten/gesicht';

// ───────── Fahrer-Foto (nur auf diesem Gerät) ─────────
function FahrerFoto() {
  const gesicht = useGesicht();
  const [fehler, setFehler] = useState('');
  const waehle = async (ev: Event) => {
    const datei = (ev.target as HTMLInputElement).files?.[0];
    if (!datei) return;
    try {
      await setzeGesicht(datei);
      setFehler('');
    } catch {
      setFehler(t('Das Bild ließ sich nicht lesen.'));
    }
  };
  return (
    <div class="flex items-center gap-3 rounded-2xl border border-[var(--linie-stark)] p-3">
      <span class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--nm-bedienung)] bg-flaeche text-dunst">
        {gesicht ? <img src={gesicht} alt="" class="size-full object-cover" /> : <span class="text-xs">{t('Foto')}</span>}
      </span>
      <span class="min-w-0 flex-1">
        <label class="inline-flex min-h-[44px] cursor-pointer items-center font-semibold text-gold-300">
          {gesicht ? t('Fahrer-Foto ändern') : t('Fahrer-Foto hinzufügen')}
          <input type="file" accept="image/*" class="sr-only" aria-label={t('Fahrer-Foto')} onChange={waehle} />
        </label>
        {gesicht && (
          <button type="button" class="ml-3 min-h-[44px] text-sm text-dunst underline" onClick={() => void loescheGesicht()}>
            {t('Entfernen')}
          </button>
        )}
        <small class="block text-[13px] leading-snug text-dunst">{t('Bleibt auf deinem Handy. Andere sehen dich nur als Fahrzeug.')}</small>
        {fehler && <small class="block text-[13px] text-[var(--warnung)]">{fehler}</small>}
      </span>
    </div>
  );
}

// ───────── Schlitten wählen (Name und Farbe) ─────────
function KamelWahl({ name, farbe, fahrzeug, avatar, onName, onFarbe, onFahrzeug, onAvatar }: { name: string; farbe: number; fahrzeug: number; avatar: number; onName: (n: string) => void; onFarbe: (f: number) => void; onFahrzeug: (f: number) => void; onAvatar: (a: number) => void }) {
  return (
    <div class="grid gap-3">
      <label class="grid gap-1.5 text-[15px] text-dunst">
        {t('Name deines Schlittens')}
        <input class="feld min-h-[48px] text-[17px]" type="text" maxLength={24} value={name} onInput={(e) => onName((e.target as HTMLInputElement).value)} autocomplete="off" />
      </label>
      <div role="radiogroup" aria-label={t('Fahrzeug')} class="grid grid-cols-4 gap-2">
        {FAHRZEUGE.map((f, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={fahrzeug === i}
            aria-label={t(f.name)}
            onClick={() => onFahrzeug(i)}
            class={`grid min-h-[64px] place-items-center gap-0.5 rounded-2xl border-2 px-1 py-1 ${fahrzeug === i ? 'border-[var(--nm-stern)] bg-flaeche' : 'border-[var(--nm-bedienung)]'}`}
          >
            <svg viewBox="0 0 46 34" class="w-10" aria-hidden="true">
              <FahrzeugBild farbe={SCHLITTEN_FARBEN[farbe % SCHLITTEN_FARBEN.length]} fahrzeug={i} />
            </svg>
            <span class="text-[11px] text-dunst">{t(f.name)}</span>
          </button>
        ))}
      </div>
      <div>
        <p class="mb-1.5 text-[15px] text-dunst">{t('Figur auf deinem Schlitten (alle sehen sie)')}</p>
        <div role="radiogroup" aria-label={t('Figur')} class="grid grid-cols-6 gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={avatar < 0}
            aria-label={t('Keine Figur')}
            onClick={() => onAvatar(-1)}
            class={`grid min-h-[48px] place-items-center rounded-2xl border-2 text-xs text-dunst ${avatar < 0 ? 'border-[var(--nm-stern)] bg-flaeche' : 'border-[var(--nm-bedienung)]'}`}
          >
            {t('keine')}
          </button>
          {AVATARE.map((a, i) => (
            <button
              type="button"
              role="radio"
              aria-checked={avatar === i}
              aria-label={t(a.name)}
              onClick={() => onAvatar(i)}
              class={`grid min-h-[48px] place-items-center rounded-2xl border-2 p-1 ${avatar === i ? 'border-[var(--nm-stern)] bg-flaeche' : 'border-[var(--nm-bedienung)]'}`}
            >
              <svg viewBox="0 0 20 20" class="w-8" aria-hidden="true">
                <AvatarBild avatar={i} cx={10} cy={10} r={10} />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <FahrerFoto />
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
  const [fahrzeug, setFahrzeug] = useState(0);
  const [avatar, setAvatar] = useState(-1);
  useEffect(() => {
    void letztesKamel().then((k) => {
      if (k) {
        setName(k.name);
        setFarbe(k.farbe);
        setFahrzeug(k.fahrzeug ?? 0);
        setAvatar(k.avatar ?? -1);
      }
    });
  }, []);
  // Ohne gemerkten Schlitten und ohne Namen steht ein Vorschlag da (Würfel im Namensfeld)
  useEffect(() => setName((n) => n || standard || zufallsname()), [standard]);
  return { name, setName, farbe, setFarbe, fahrzeug, setFahrzeug, avatar, setAvatar };
}

const knopf = 'flex min-h-[56px] w-full items-center justify-center rounded-full px-6 text-[17px] font-bold text-[#1a1020] no-underline disabled:opacity-50';
const KNOPF_STIL = { background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' };

function Kopf({ titel, text }: { titel: string; text?: string }) {
  return (
    <div class="mb-5 mt-2">
      <p class="etikett inline-flex items-center gap-2 !text-gold-300">
        <span class="rounded-full border border-gold-300 px-2 py-0.5">{t('Beta')}</span>
        <span>{t('Schlittenfahren')}</span>
      </p>
      <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{titel}</h1>
      {text && <p class="mt-3 max-w-prose text-[17px] leading-snug text-dunst">{text}</p>}
    </div>
  );
}

const HINWEIS = 'Beta: Wir probieren das gerade aus. Jede Bewertung ist ein Schritt, egal an welchem Stand. Ab 18, trink verantwortungsvoll.';

// ───────── Übersicht: meine Rennen, neues Rennen ─────────
export function SchlittenfahrenUebersicht() {
  const ids = useLive(meineRennen, [], [] as string[]);
  const meine = ids;
  const [daten, setDaten] = useState<Record<string, RennenDaten | null>>({});
  const [optionen, setOptionen] = useState(false);
  const k = useKamelWahl();
  const [code, setCode] = useState('');
  const [startet, setStartet] = useState(false);
  const [fehler, setFehler] = useState('');
  const alle = useEintraege();
  const ich = useGeraetId();
  useEffect(() => {
    let aktiv = true;
    for (const id of meine) {
      ladeRennen(id)
        .then((d) => aktiv && setDaten((x) => ({ ...x, [id]: d })))
        .catch((e) => aktiv && e instanceof ApiFehler && e.status === 404 && setDaten((x) => ({ ...x, [id]: null })));
    }
    return () => {
      aktiv = false;
    };
  }, [meine.join(',')]);

  const losgehts = async () => {
    setStartet(true);
    setFehler('');
    try {
      const n = k.name.trim();
      const id = await legeRennenAn(`Rennen von ${n.slice(0, 13)}`, 5, n, k.farbe, k.fahrzeug, k.avatar);
      await merkeKamel(n, k.farbe, k.fahrzeug, k.avatar);
      location.hash = `#/schlittenfahren/${id}`;
    } catch (e) {
      setFehler(fehlerText(e));
      setStartet(false);
    }
  };

  return (
    <div class="nm karawane">
      <Kopf titel={t('Schlittenfahren')} text={t('Jede Bewertung bringt deinen Schlitten einen Schritt weiter. Wer zuerst im Ziel ist, gewinnt.')} />
      {!HAT_SERVER && <p class="glas mb-4 rounded-2xl p-4 text-dunst">{t('Rennen brauchen eine Verbindung zum Server. Hier läuft die App nur lokal.')}</p>}

      {meine.length > 0 && (() => {
        const zeilen = meine
          .map((id) => ({ id, d: daten[id], stand: daten[id] && alle ? berechneRennen(daten[id]!.rennen, daten[id]!.teilnehmer, alle) : null }))
          .filter((z) => z.d !== null);
        const liste = (rs: typeof zeilen, chronik: boolean) => (
          <ul class="m-0 mb-4 grid list-none gap-2 p-0" aria-label={chronik ? t('Sieger-Chronik') : t('Deine Rennen')}>
            {rs.map(({ id, d, stand }) => {
              const m = stand?.bahnen.find((b) => b.geraet === ich);
              const sieger = chronik ? stand?.sieger : null;
              return (
                <li>
                  <a href={`#/schlittenfahren/${id}`} class="glas flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-eis no-underline">
                    {sieger && (
                      <svg viewBox="0 0 46 34" class="w-12 shrink-0" aria-hidden="true">
                        <FahrzeugBild farbe={SCHLITTEN_FARBEN[sieger.farbe % SCHLITTEN_FARBEN.length]} fahrzeug={sieger.fahrzeug} avatar={sieger.avatar} />
                      </svg>
                    )}
                    <span class="min-w-0 flex-1">
                      <b class="block truncate text-[17px]">{d ? d.rennen.name : '…'}</b>
                      <span class="block truncate text-sm text-dunst">
                        {sieger
                          ? `${t('Sieger')}: ${sieger.kamel}${sieger.geraet === ich ? ` (${t('du')})` : ''}`
                          : d && stand
                            ? stand.vorbei
                              ? t('Vorbei')
                              : tn(stand.tageUebrig, 'Noch {n} Tag', 'Noch {n} Tage')
                            : ''}
                        {d && ` · ${t('{n} fahren mit', { n: d.teilnehmer.length })}`}
                      </span>
                    </span>
                    {m && <span class="font-display text-3xl text-gold-300">{m.platz}.</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        );
        const laufend = zeilen.filter((z) => !z.stand?.vorbei);
        const vorbei = zeilen.filter((z) => z.stand?.vorbei);
        return (
          <>
            {laufend.length > 0 && liste(laufend, false)}
            {vorbei.length > 0 && (
              <section aria-label={t('Sieger-Chronik')}>
                <h2 class="etikett mb-2 !text-gold-300">{t('Sieger-Chronik')}</h2>
                {liste(vorbei, true)}
              </section>
            )}
          </>
        );
      })()}

      {optionen ? (
        <NeuesRennen onZu={() => setOptionen(false)} />
      ) : (
        <section class="glas grid gap-4 rounded-3xl p-4" aria-label={t('Dein Schlitten')}>
          <p class="m-0 text-[17px] font-semibold text-eis">
            <KopfIcon name="ziel" groesse={18} />
            {t('Such dir deinen Schlitten aus')}
          </p>
          <KamelWahl name={k.name} farbe={k.farbe} fahrzeug={k.fahrzeug} avatar={k.avatar} onName={k.setName} onFarbe={k.setFarbe} onFahrzeug={k.setFahrzeug} onAvatar={k.setAvatar} />
          <button type="button" class={knopf} style={KNOPF_STIL} disabled={!HAT_SERVER || startet || k.name.trim().length < 2} onClick={() => void losgehts()}>
            {t('Rennen mit Freunden starten')}
          </button>
          {k.name.trim().length < 2 && <p class="m-0 text-center text-sm text-dunst">{t('Gib deinem Schlitten einen Namen (mindestens 2 Zeichen).')}</p>}
          {fehler && (
            <p role="alert" class="m-0 text-center text-[15px] text-[var(--warnung)]">
              {fehler}
            </p>
          )}
          <p class="m-0 text-center">
            <button type="button" class="min-h-[44px] text-dunst underline" disabled={!HAT_SERVER} onClick={() => setOptionen(true)}>
              {t('Name und Länge des Rennens ändern')}
            </button>
          </p>
          <p class="m-0 text-center text-sm text-dunst">{t('Fünf Schritte bis ins Ziel. Danach lädst du Freunde ein.')}</p>
        </section>
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
            href={RENNEN_ID.test(code) ? `#/schlittenfahren/${code}` : undefined}
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
  const [ziel, setZiel] = useState<number>(5);
  const k = useKamelWahl();
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const ok = rname.trim().length >= 2 && k.name.trim().length >= 2;
  const los = async () => {
    setLaeuft(true);
    setFehler('');
    try {
      const id = await legeRennenAn(rname.trim(), ziel, k.name.trim(), k.farbe, k.fahrzeug, k.avatar);
      await merkeKamel(k.name.trim(), k.farbe, k.fahrzeug, k.avatar);
      location.hash = `#/schlittenfahren/${id}`;
    } catch (e) {
      setFehler(fehlerText(e));
      setLaeuft(false);
    }
  };
  return (
    <section class="glas grid gap-4 rounded-3xl p-4" aria-label={t('Neues Rennen')}>
      <label class="grid gap-1.5 text-[15px] text-dunst">
        {t('Name des Rennens')}
        <input class="feld min-h-[48px] text-[17px]" type="text" maxLength={24} value={rname} onInput={(e) => setRname((e.target as HTMLInputElement).value)} autocomplete="off" />
      </label>
      <div>
        <p class="mb-1.5 text-[15px] text-dunst">{t('Länge: so viele Bewertungen bis ins Ziel')}</p>
        <div role="radiogroup" aria-label={t('Länge')} class="grid grid-cols-4 gap-2">
          {RENNEN_ZIELE.map((z) => (
            <button
              type="button"
              role="radio"
              aria-checked={ziel === z}
              onClick={() => setZiel(z)}
              class={`min-h-[56px] rounded-2xl border-2 px-2 text-center font-display text-2xl ${ziel === z ? 'border-[var(--nm-stern)] bg-flaeche text-eis' : 'border-[var(--nm-bedienung)] text-dunst'}`}
            >
              {z}
            </button>
          ))}
        </div>
        <div class="mt-2 flex items-center justify-center gap-4" role="group" aria-label={t('Eigene Länge')}>
          <button type="button" class="size-12 rounded-full border-2 border-[var(--nm-bedienung)] text-2xl text-eis disabled:opacity-40" aria-label={t('Einen Schritt weniger')} disabled={ziel <= RENNEN_MIN} onClick={() => setZiel(Math.max(RENNEN_MIN, ziel - 1))}>
            −
          </button>
          <output class="min-w-[9ch] text-center text-[17px] text-eis" aria-live="polite">
            {tn(ziel, '{n} Schritt', '{n} Schritte')}
          </output>
          <button type="button" class="size-12 rounded-full border-2 border-[var(--nm-bedienung)] text-2xl text-eis disabled:opacity-40" aria-label={t('Einen Schritt mehr')} disabled={ziel >= RENNEN_MAX} onClick={() => setZiel(Math.min(RENNEN_MAX, ziel + 1))}>
            +
          </button>
        </div>
      </div>
      <KamelWahl name={k.name} farbe={k.farbe} fahrzeug={k.fahrzeug} avatar={k.avatar} onName={k.setName} onFarbe={k.setFarbe} onFahrzeug={k.setFahrzeug} onAvatar={k.setAvatar} />
      {fehler && (
        <p role="alert" class="m-0 text-[15px] text-[var(--warnung)]">
          {fehler}
        </p>
      )}
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
  const { d, nichtDa, fehler, neuLaden } = useRennenDaten(id);
  const alle = useEintraege();
  const ich = useGeraetId();
  const [meldung, setMeldung] = useState('');

  if (nichtDa)
    return (
      <div class="nm karawane">
        <Kopf titel={t('Rennen nicht gefunden')} text={t('Vielleicht ist der Code falsch geschrieben.')} />
        <a href="#/schlittenfahren" class={knopf} style={KNOPF_STIL}>
          {t('Zu den Rennen')}
        </a>
        <p class="mt-4 text-center">
          <button type="button" class="min-h-[44px] text-dunst" onClick={() => void vergissRennen(id)}>
            {t('Aus meiner Liste entfernen')}
          </button>
        </p>
      </div>
    );
  if (!d || !alle)
    return (
      <div class="nm karawane">
        {fehler && <p class="glas rounded-2xl p-4 text-dunst">{fehler}</p>}
      </div>
    );

  const stand = berechneRennen(d.rennen, d.teilnehmer, alle);
  const dabei = d.teilnehmer.some((x) => x.geraet === ich);
  const link = rennenLink(location.href, id);
  const meine = stand.bahnen.find((b) => b.geraet === ich) ?? null;
  const satz = lageText(lage(stand, d.rennen.ziel, ich));
  const titel = d.rennen.name;
  const liste = sichtbareBahnen(stand.bahnen, ich, 10);
  const unter = stand.vorbei
    ? undefined
    : [t('{n} fahren mit', { n: stand.bahnen.length }), tn(d.rennen.ziel, '{n} Schritt bis ins Ziel', '{n} Schritte bis ins Ziel'), tn(stand.tageUebrig, 'noch {n} Tag', 'noch {n} Tage')].filter(Boolean).join(' · ');

  const teile = async () => {
    setMeldung(t('Erzeuge Bild …'));
    const r = await teileRennenBild({ rennen: titel, ziel: d.rennen.ziel, podest: stand.bahnen.slice(0, 3), mein: meine, link });
    setMeldung(r === 'gespeichert' ? t('Bild gespeichert, jetzt in die Story legen.') : '');
  };

  return (
    <div class="nm karawane">
      {stand.vorbei && stand.sieger && <Konfetti />}
      <a href="#/schlittenfahren" class="mb-1 inline-block min-h-[44px] py-3 text-gold-300 no-underline">
        ‹ {t('Alle Rennen')}
      </a>
      <Kopf titel={titel} text={unter} />

      {satz && (
        <p class="glas mb-3 rounded-2xl px-4 py-3 text-[17px] font-semibold leading-snug text-eis" aria-live="polite">
          {satz}
        </p>
      )}

      <Rennbahn bahnen={stand.bahnen} ich={ich} />

      {stand.vorbei && (
        <>
          <p class="mt-4 rounded-2xl border-2 border-[var(--nm-stern)] bg-flaeche p-4 text-center font-display text-2xl uppercase tracking-wide text-eis">
            {stand.sieger ? t('{kamel} ist im Ziel!', { kamel: stand.sieger.kamel }) : t('Das Rennen ist vorbei.')}
          </p>
          {stand.sieger && <Siegerpodest bahnen={stand.bahnen} ich={ich} ziel={d.rennen.ziel} />}
          {stand.sieger && (
            <div class="mt-4 grid justify-items-center gap-2">
              <button type="button" class={knopf} style={KNOPF_STIL} onClick={() => void teile()}>
                {t('Ergebnis teilen')}
              </button>
              <p class="m-0 min-h-5 text-xs text-dunst" aria-live="polite">
                {meldung}
              </p>
            </div>
          )}
        </>
      )}

      <ol class="m-0 mt-4 grid list-none gap-2 p-0" aria-label={t('Stand des Rennens')}>
        {liste.sichtbar.map((b) => (
          <li class="glas flex min-h-[56px] items-center gap-3 rounded-2xl px-4 py-2">
            <span class="grid size-8 shrink-0 place-items-center rounded-full font-display text-lg text-[#1a1020]" style={{ background: farbeVon(b.farbe) }}>
              {b.platz}
            </span>
            <b class="min-w-0 flex-1 truncate text-[17px] text-eis">
              {b.kamel}
              {b.geraet === ich && <span class="ml-2 rounded-full border border-gold-300 px-2 py-0.5 text-xs font-normal text-gold-300">{t('du')}</span>}
              {!stand.vorbei && b.platz === 1 && b.schritte > 0 && <span class="ml-2 rounded-full bg-[var(--nm-stern)] px-2 py-0.5 text-xs font-normal text-[#1a1020]">{t('vorn')}</span>}
            </b>
            <span class="font-mono text-sm text-dunst">
              {b.schritte}/{d.rennen.ziel}
            </span>
          </li>
        ))}
        {liste.rest > 0 && <li class="text-center text-sm text-dunst">{t('… und {n} weitere', { n: liste.rest })}</li>}
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
              <TeilenKnopf link={link} name={titel} />
            </section>
          )}
        </>
      ) : (
        <BeitrittsBlock id={id} voll={d.teilnehmer.length >= 12} vorbei={stand.vorbei} danach={neuLaden} />
      )}
      {dabei && <Austritt id={id} ersteller={d.rennen.ersteller === ich} />}
      {fehler && <p class="mt-3 text-sm text-dunst">{fehler}</p>}
      <p class="mt-4 text-sm text-dunst">{t(HINWEIS)}</p>
      <Betreiber />
    </div>
  );
}

/** Rennen verlassen (jeder) oder löschen (wer es angelegt hat), jeweils mit einer Rückfrage. */
function Austritt({ id, ersteller }: { id: string; ersteller: boolean }) {
  const [frage, setFrage] = useState<'verlassen' | 'loeschen' | null>(null);
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const los = async () => {
    setLaeuft(true);
    setFehler('');
    try {
      await (frage === 'loeschen' ? loescheRennen(id) : verlasseRennen(id));
      location.hash = '#/schlittenfahren';
    } catch (e) {
      setFehler(fehlerText(e));
      setLaeuft(false);
    }
  };
  if (frage)
    return (
      <section class="glas mt-5 grid gap-3 rounded-2xl p-4" role="alertdialog" aria-label={frage === 'loeschen' ? t('Rennen löschen') : t('Rennen verlassen')}>
        <p class="m-0 text-[16px] text-eis">
          {frage === 'loeschen' ? t('Das Rennen wird für alle gelöscht. Das lässt sich nicht rückgängig machen.') : t('Du verlässt das Rennen. Deine Schritte hier sind dann weg.')}
        </p>
        {fehler && (
          <p role="alert" class="m-0 text-[15px] text-[var(--warnung)]">
            {fehler}
          </p>
        )}
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="min-h-[48px] rounded-full border-2 border-[var(--nm-bedienung)] font-semibold text-eis" onClick={() => setFrage(null)} disabled={laeuft}>
            {t('Abbrechen')}
          </button>
          <button type="button" class="min-h-[48px] rounded-full font-bold text-[#1a1020] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#ffb4a8,#f0344f)' }} onClick={() => void los()} disabled={laeuft}>
            {frage === 'loeschen' ? t('Ja, löschen') : t('Ja, verlassen')}
          </button>
        </div>
      </section>
    );
  return (
    <div class="mt-4 flex flex-wrap justify-center gap-x-6">
      <button type="button" class="min-h-[44px] text-dunst underline" onClick={() => setFrage('verlassen')}>
        {t('Rennen verlassen')}
      </button>
      {ersteller && (
        <button type="button" class="min-h-[44px] text-dunst underline" onClick={() => setFrage('loeschen')}>
          {t('Rennen löschen')}
        </button>
      )}
    </div>
  );
}

function TeilenKnopf({ link, name }: { link: string; name: string }) {
  const [kopiert, setKopiert] = useState(false);
  const teile = async () => {
    try {
      if (navigator.share) return void (await navigator.share({ title: name, text: t('Fahr mit beim Schlittenfahren: {name}', { name }), url: link }));
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
      await trittBei(id, k.name.trim(), k.farbe, k.fahrzeug, k.avatar);
      await merkeKamel(k.name.trim(), k.farbe, k.fahrzeug, k.avatar);
      danach();
    } catch (e) {
      setFehler(fehlerText(e));
    }
    setLaeuft(false);
  };
  return (
    <section class="glas mt-5 grid gap-4 rounded-3xl p-4" aria-label={t('Mitfahren')}>
      <p class="m-0 text-[17px] font-semibold text-eis">{t('Fahr mit! Such dir einen Schlitten aus.')}</p>
      <KamelWahl name={k.name} farbe={k.farbe} fahrzeug={k.fahrzeug} avatar={k.avatar} onName={k.setName} onFarbe={k.setFarbe} onFahrzeug={k.setFahrzeug} onAvatar={k.setAvatar} />
      <button type="button" class={knopf} style={KNOPF_STIL} disabled={!ok || laeuft} onClick={() => void los()}>
        {t('Mitfahren')}
      </button>
      {fehler && (
        <p role="alert" class="m-0 text-[15px] text-[var(--warnung)]">
          {fehler}
        </p>
      )}
      <p class="m-0 text-sm text-dunst">{t('Es zählen deine Bewertungen ab jetzt. Kein Konto nötig.')}</p>
    </section>
  );
}
