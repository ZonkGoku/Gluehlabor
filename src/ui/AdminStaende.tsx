// Admin „Stände": alle Stände in einer Liste, mehrere antippen, dann zusammenführen, umbenennen, ausblenden oder löschen.
// Wer bewertet hat, bleibt an jeder Bewertung erhalten: Geändert werden nur Stand, Markt und Stadt.
import { useState } from 'preact/hooks';
import { aendereStand, entferne, verstecke } from '../daten/moderation';
import type { LokalerEintrag } from '../daten/db';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { zahl2 } from '../lib/format';
import { baueStaende, type Stand } from '../lib/staende';
import type { Gewichte } from '../lib/modell';
import { MARKTLISTE } from './stammdaten';
import { t, tn } from '../i18n';

const KNOPF = 'glas min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold text-eis transition hover:text-gold-300 disabled:opacity-40';
const FELD = 'glas w-full rounded-2xl px-3.5 py-2.5 text-base text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70';

type Tu = (f: () => Promise<unknown>, ok: string | (() => string)) => Promise<void>;

const raterNamen = (s: Stand<LokalerEintrag>) => [...new Set(s.bewertungen.map((e) => (istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e))))].join(', ');

export function AdminStaende({ alle, gewichte, tu }: { alle: readonly LokalerEintrag[]; gewichte: Gewichte; tu: Tu }) {
  const [q, setQ] = useState('');
  const [wahl, setWahl] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [stadt, setStadt] = useState('');
  const [markt, setMarkt] = useState('');

  const staende = baueStaende(alle as LokalerEintrag[], MARKTLISTE, gewichte).sort((a, b) => a.stand.localeCompare(b.stand, 'de'));
  const k = q.trim().toLowerCase();
  const sichtbar = staende.filter((s) => !k || `${s.stand} ${s.stadt ?? ''} ${s.markt} ${raterNamen(s)}`.toLowerCase().includes(k));
  const gewaehlt = staende.filter((s) => wahl.has(s.id));
  const ids = gewaehlt.flatMap((s) => s.bewertungen.map((e) => e.id));
  const groesster = [...gewaehlt].sort((a, b) => b.bewertungen.length - a.bewertungen.length)[0];

  const umschalten = (s: Stand<LokalerEintrag>) =>
    setWahl((alt) => {
      const n = new Set(alt);
      if (n.has(s.id)) n.delete(s.id);
      else n.add(s.id);
      const rest = staende.filter((x) => n.has(x.id));
      const g = [...rest].sort((a, b) => b.bewertungen.length - a.bewertungen.length)[0];
      setName(g?.stand ?? '');
      setStadt(g?.stadt ?? '');
      setMarkt(g && g.markt !== MARKTLISTE.sonstiger ? g.markt : '');
      return n;
    });

  const fertig = () => setWahl(new Set());

  return (
    <section>
      <input class={FELD} placeholder={t('Stand, Stadt oder Name suchen')} aria-label={t('Stand, Stadt oder Name suchen')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      <ul class="mt-3 grid gap-2" style={{ paddingBottom: gewaehlt.length ? '16rem' : undefined }}>
        {sichtbar.map((s) => {
          const an = wahl.has(s.id);
          return (
            <li>
              <label class={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2 ${an ? 'border-[var(--nm-akzent-text)] bg-flaeche-hover' : 'border-rand bg-flaeche'}`}>
                <input type="checkbox" class="size-6 shrink-0" checked={an} onChange={() => umschalten(s)} aria-label={t('Auswählen: {stand}', { stand: s.stand })} />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-base font-semibold text-eis">{s.stand}</span>
                  <span class="block truncate text-sm text-dunst">{[s.stadt, s.markt !== MARKTLISTE.sonstiger ? s.markt : null].filter(Boolean).join(' · ')}</span>
                  <span class="block truncate text-xs text-dunst">{raterNamen(s)}</span>
                </span>
                <span class="text-right">
                  <span class="block font-display text-xl leading-none text-gold-300">{zahl2(s.wert.gesamt)}</span>
                  <span class="block font-mono text-xs text-dunst">{tn(s.bewertungen.length, '{n} Bewertung', '{n} Bewertungen')}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {sichtbar.length === 0 && <p class="mt-3 text-dunst">{t('Nichts gefunden.')}</p>}

      {gewaehlt.length > 0 && (
        <div
          class="glas-stark fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl rounded-t-[28px] p-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          role="region"
          aria-label={t('Auswahl bearbeiten')}
        >
          <p class="text-sm font-semibold text-eis">
            {gewaehlt.length === 1 ? gewaehlt[0].stand : t('{n} Stände gewählt', { n: gewaehlt.length })} · {tn(ids.length, '{n} Bewertung', '{n} Bewertungen')}
          </p>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <label class="col-span-3 text-xs text-dunst">
              {gewaehlt.length > 1 ? t('Alle zusammenführen unter diesem Namen') : t('Name')}
              <input class={`${FELD} mt-1`} value={name} maxLength={80} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
            </label>
            <label class="col-span-1 text-xs text-dunst">
              {t('Stadt')}
              <input class={`${FELD} mt-1`} value={stadt} maxLength={60} onInput={(e) => setStadt((e.target as HTMLInputElement).value)} />
            </label>
            <label class="col-span-2 text-xs text-dunst">
              {t('Markt')}
              <input class={`${FELD} mt-1`} value={markt} maxLength={80} onInput={(e) => setMarkt((e.target as HTMLInputElement).value)} />
            </label>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="min-h-[48px] flex-1 rounded-full px-5 font-semibold text-[#1a1020] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
              disabled={name.trim().length < 2}
              onClick={() =>
                confirm(gewaehlt.length > 1 ? t('{n} Stände zu „{b}" zusammenführen? Wer bewertet hat, bleibt an jeder Bewertung erhalten.', { n: gewaehlt.length, b: name.trim() }) : t('Speichern?')) &&
                void tu(async () => {
                  await aendereStand(ids, name.trim(), markt.trim() || (groesster?.markt ?? MARKTLISTE.sonstiger), stadt.trim());
                  fertig();
                }, gewaehlt.length > 1 ? 'Zusammengeführt.' : 'Gespeichert.')
              }
            >
              {gewaehlt.length > 1 ? t('Zusammenführen') : t('Speichern')}
            </button>
            <button
              type="button"
              class={KNOPF}
              onClick={() => confirm(t('Diese Stände ausblenden?')) && void tu(async () => { await verstecke(ids, true); fertig(); }, 'Ausgeblendet.')}
            >
              {t('Ausblenden')}
            </button>
            <button
              type="button"
              class={`${KNOPF} !text-wein-400`}
              onClick={() =>
                confirm(t('{n} Bewertungen endgültig löschen? Das lässt sich nicht rückgängig machen.', { n: ids.length })) &&
                void tu(async () => { await entferne(gewaehlt.flatMap((s) => s.bewertungen)); fertig(); }, () => t('{n} Bewertungen gelöscht.', { n: ids.length }))
              }
            >
              {t('Löschen')}
            </button>
            <button type="button" class={KNOPF} onClick={fertig}>
              {t('Abbrechen')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
