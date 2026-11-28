// Ohne Namen keine Bewertung: Beim ersten Speichern (und beim Mitbewerten) fragt dieses Blatt nach dem Namen.
import { useEffect, useRef, useState } from 'preact/hooks';
import { setzeName } from '../../daten/db';
import { synchronisiere } from '../../daten/sync';
import { GRENZEN, pruefeName } from '../../lib/community';
import { zufallsname } from '../../lib/zufallsname';
import { t } from '../../i18n';

interface Props {
  onFertig: () => void;
  onZu: () => void;
}

export function NameBlatt({ onFertig, onZu }: Props) {
  // Ein Vorschlag steht schon da: ein Tipp auf „Speichern“ genügt, der Würfel mischt neu, Tippen ersetzt ihn.
  const [name, setName] = useState(() => zufallsname());
  const [fehler, setFehler] = useState('');
  const feld = useRef<HTMLInputElement>(null);
  useEffect(() => {
    feld.current?.focus();
    feld.current?.select();
  }, []);

  const weiter = async () => {
    const p = pruefeName(name);
    if (!p.ok) return setFehler(t(p.grund));
    if (p.name === null) return setFehler(t('Bitte einen Namen eingeben.'));
    await setzeName(p.name);
    void synchronisiere();
    onFertig();
  };

  return (
    <div class="nm fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Dein Name')}
        class="glas-stark w-full max-w-md rounded-t-[28px] p-5 text-eis sm:rounded-[28px]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <h2 class="font-display text-[28px] uppercase leading-none tracking-wide">{t('Wie heißt du?')}</h2>
        <p class="mt-2 text-sm text-dunst">{t('Öffentlich sichtbar.')}</p>
        <div class="mt-4 flex gap-2">
        <input
          ref={feld}
          class="glas min-w-0 flex-1 rounded-2xl px-4 py-3 text-base text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70"
          type="text"
          maxLength={GRENZEN.name}
          autocomplete="nickname"
          enterkeyhint="done"
          placeholder={t('Name oder Spitzname')}
          aria-label={t('Name oder Spitzname')}
          value={name}
          onInput={(e) => {
            setName((e.target as HTMLInputElement).value);
            setFehler('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && void weiter()}
        />
        <button
          type="button"
          class="glas grid size-[52px] shrink-0 place-items-center rounded-2xl text-gold-300"
          aria-label={t('Anderen Namen vorschlagen')}
          title={t('Anderen Namen vorschlagen')}
          onClick={() => {
            setName(zufallsname());
            setFehler('');
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>
        </div>
        {fehler && <p class="mt-2 text-sm text-wein-400">{fehler}</p>}
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => void weiter()}
            class="flex-1 rounded-full px-5 py-3 font-semibold text-[#1a1020]"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            {t('Speichern und bewerten')}
          </button>
          <button type="button" onClick={onZu} class="glas rounded-full px-4 py-3 text-sm text-dunst hover:text-eis">
            {t('Zurück')}
          </button>
        </div>
      </div>
    </div>
  );
}
