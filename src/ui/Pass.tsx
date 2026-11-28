// Glühwein-Pass: Stufe, Abzeichen und Stempel je Stadt. Alles aus den Bewertungen dieses Geräts, ohne Anmeldung.
import { berechneAbzeichen, passStempel, stufeFuer, type Abzeichen } from '../lib/abzeichen';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';
import { KopfIcon } from './nacht/KopfIcon';
import { t, tn } from '../i18n';

export function AbzeichenKachel({ a }: { a: Abzeichen }) {
  return (
    <li
      class={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center ${a.erreicht ? 'border-[var(--nm-stern)] bg-flaeche' : 'border-rand opacity-75'}`}
      aria-label={a.erreicht ? t('{name}: erreicht', { name: t(a.name) }) : t('{name}: noch nicht erreicht', { name: t(a.name) })}
    >
      <span
        class="grid size-11 shrink-0 place-items-center rounded-full"
        style={a.erreicht ? { background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)', color: '#1a1020' } : { background: 'var(--nm-stern-leer)', color: 'var(--nm-text-2)' }}
      >
        <Symbol name={a.symbol} groesse={22} />
      </span>
      <b class="block text-sm leading-tight text-eis">{t(a.name)}</b>
      <span class="block text-xs leading-snug text-dunst">
        {t(a.text)}
        {!a.erreicht && a.ziel > 1 && ` · ${a.stand}/${a.ziel}`}
      </span>
    </li>
  );
}

function useMeine() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const geraetId = useGeraetId();
  if (!alle) return null;
  // Meine: von dieser Gerätekennung, oder (ganz frisch, noch nicht beim Server angemeldet) ohne Kennung
  const meine = alle.filter((e) => e.sync !== 'bestand' && !e.id.startsWith('import-') && (geraetId ? e.geraet === geraetId : !e.geraet));
  return { meine, abzeichen: berechneAbzeichen(meine, alle, MARKTLISTE, gewichte), stempel: passStempel(meine, MARKTLISTE) };
}

export function PassKopf() {
  const d = useMeine();
  if (!d) return null;
  const { meine } = d;
  const stand = stufeFuer(meine.length);
  return (
    <section aria-label={t('Dein Glühwein-Pass')}>
      <div class="glas rahmen-licht rounded-3xl p-5">
        <p class="etikett !text-gold-300">{t('Dein Glühwein-Pass')}</p>
        <p class="mt-1 font-display text-[40px] uppercase leading-none tracking-wide text-eis">{t(stand.stufe.name)}</p>
        <p class="mt-2 text-sm text-dunst">{tn(meine.length, '{n} Bewertung', '{n} Bewertungen')}</p>
        <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-spur" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stand.anteil * 100)}>
          <div class="h-full rounded-full" style={{ width: `${Math.max(4, stand.anteil * 100)}%`, background: 'linear-gradient(90deg,#ffe29a,#ff8a3d)' }} />
        </div>
        <p class="mt-2 text-sm text-eis">
          {stand.naechste ? t('Noch {n} bis {name}', { n: stand.fehlen, name: t(stand.naechste.name) }) : t('Höchste Stufe erreicht')}
        </p>
        {meine.length === 0 && (
          <a
            href="#/erfassen"
            class="mt-4 flex min-h-[52px] items-center justify-center rounded-full px-6 font-semibold text-[#1a1020] no-underline"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            {t('Jetzt bewerten')}
          </a>
        )}
      </div>
    </section>
  );
}

export function PassAbzeichen() {
  const d = useMeine();
  if (!d) return null;
  const { abzeichen, stempel } = d;
  const erreicht = abzeichen.filter((a) => a.erreicht).length;
  return (
    <section class="grid gap-4">
      {/* Wer noch nichts erreicht hat, sieht erst nur die Überschrift: die zehn leeren Kacheln machen die Seite lang und sagen einem Neuling nichts. */}
      <details class="abzeichen" open={erreicht > 0}>
        <summary class="mb-3 flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-display text-[26px] uppercase leading-none tracking-wide text-eis">
          <KopfIcon name="siegel" groesse={22} />
          {t('Abzeichen')} <span class="font-mono text-base text-dunst">{erreicht}/{abzeichen.length}</span>
          <span class="text-base text-dunst" aria-hidden="true">▾</span>
        </summary>
        <ul class="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-3">
          {abzeichen.map((a) => (
            <AbzeichenKachel a={a} />
          ))}
        </ul>
      </details>

      {stempel.length > 0 && (
        <div>
          <h2 class="mb-3 font-display text-[26px] uppercase leading-none tracking-wide text-eis"><KopfIcon name="pin" groesse={22} />
            {t('Stempel')}
          </h2>
          <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
            {stempel.map((s) => (
              <li class="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[var(--nm-stern)] px-4 text-eis">
                <Symbol name="pin" groesse={16} />
                <b>{s.stadt}</b>
                <span class="font-mono text-sm text-dunst">{s.anzahl}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
