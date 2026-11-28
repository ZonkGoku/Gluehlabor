// Macht sichtbar, dass man gerade in einem Rennen fährt: eine schmale Leiste unter der Kopfzeile auf jeder Seite, und eine Karte auf der Startseite.
import { t } from '../../i18n';
import { farbeVon } from './Bahn';
import { FahrzeugBild } from './FahrzeugBild';
import { useGesicht } from './gesicht';
import { useMeineRennen, type MeinRennen } from './meine';

function Mini({ farbe, fahrzeug = 0, avatar = -1 }: { farbe: string; fahrzeug?: number; avatar?: number }) {
  const gesicht = useGesicht();
  return (
    <svg viewBox="0 0 46 34" class="w-9 shrink-0" aria-hidden="true">
      <g transform="translate(2 1)">
        <FahrzeugBild farbe={farbe} fahrzeug={fahrzeug} gesicht={gesicht} avatar={avatar} />
      </g>
    </svg>
  );
}

function Fortschrittsbalken({ r }: { r: MeinRennen }) {
  return (
    <span class="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--nm-spur,rgba(255,255,255,.15))]" aria-hidden="true">
      <span class="block h-full rounded-full" style={{ width: `${Math.max(4, r.meine.anteil * 100)}%`, background: farbeVon(r.meine.farbe) }} />
    </span>
  );
}

/** Schmale Leiste oben: „Du fährst im Rennen Feierabend · Platz 1 · 3/5“. */
export function RennenLeiste({ route }: { route: string }) {
  const rennen = useMeineRennen();
  if (rennen.length === 0 || route.startsWith('schlittenfahren') || route.startsWith('schlittenrennen') || route.startsWith('kamelrennen')) return null;
  const r = rennen[0];
  return (
    <a
      href={`#/schlittenfahren/${r.id}`}
      class="nm mx-4 mt-3 flex min-h-[52px] items-center gap-3 rounded-2xl border border-[var(--nm-stern)] bg-flaeche px-3 py-2 text-eis no-underline"
      aria-label={t('Du fährst im Rennen {name}. Platz {n}.', { name: r.name, n: r.meine.platz })}
    >
      <Mini farbe={farbeVon(r.meine.farbe)} fahrzeug={r.meine.fahrzeug} avatar={r.meine.avatar} />
      <span class="min-w-0 flex-1">
        <span class="flex items-baseline justify-between gap-2">
          <b class="min-w-0 truncate text-[15px]">{t('Rennen: {name}', { name: r.name })}</b>
          <span class="shrink-0 font-mono text-xs text-gold-300">
            {t('Platz {n}', { n: r.meine.platz })} · {r.meine.schritte}/{r.ziel}
          </span>
        </span>
        <Fortschrittsbalken r={r} />
      </span>
      {rennen.length > 1 && <span class="shrink-0 rounded-full border border-gold-300 px-2 py-0.5 text-xs text-gold-300">+{rennen.length - 1}</span>}
    </a>
  );
}

/** Karte auf der Startseite: dein Rennen mit Stand, oder die Einladung, eins zu starten. */
export function RennenKarte() {
  const rennen = useMeineRennen();
  if (rennen.length === 0) {
    return (
      <a href="#/schlittenfahren" class="glas rahmen-licht flex min-h-[72px] items-center gap-3 rounded-3xl p-4 text-eis no-underline">
        <Mini farbe="#ffc857" />
        <span class="min-w-0 flex-1">
          <b class="block text-[17px]">{t('Rennen mit Freunden')}</b>
          <span class="block text-sm text-dunst">{t('Wer bewertet am meisten? Starte ein Rennen und lade Freunde ein.')}</span>
        </span>
        <span aria-hidden="true" class="text-xl text-gold-300">
          →
        </span>
      </a>
    );
  }
  return (
    <div class="grid gap-2">
      {rennen.map((r) => (
        <a key={r.id} href={`#/schlittenfahren/${r.id}`} class="glas rahmen-licht flex min-h-[72px] items-center gap-3 rounded-3xl p-4 text-eis no-underline">
          <Mini farbe={farbeVon(r.meine.farbe)} fahrzeug={r.meine.fahrzeug} avatar={r.meine.avatar} />
          <span class="min-w-0 flex-1">
            <span class="flex items-baseline justify-between gap-2">
              <b class="min-w-0 truncate text-[17px]">{r.name}</b>
              <span class="shrink-0 font-display text-3xl leading-none text-gold-300">{r.meine.platz}.</span>
            </span>
            <span class="block text-sm text-dunst">{t('{n} von {m} Schritten · {k} fahren mit', { n: r.meine.schritte, m: r.ziel, k: r.fahrer })}</span>
            <Fortschrittsbalken r={r} />
          </span>
        </a>
      ))}
    </div>
  );
}
