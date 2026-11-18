// Ohne Namen keine Bewertung: Beim ersten Speichern (und beim Mitbewerten) fragt dieses Blatt nach dem Namen.
import { useEffect, useRef, useState } from 'preact/hooks';
import { setzeName } from '../../daten/db';
import { synchronisiere } from '../../daten/sync';
import { GRENZEN, pruefeName } from '../../lib/community';

interface Props {
  onFertig: () => void;
  onZu: () => void;
}

export function NameBlatt({ onFertig, onZu }: Props) {
  const [name, setName] = useState('');
  const [fehler, setFehler] = useState('');
  const feld = useRef<HTMLInputElement>(null);
  useEffect(() => feld.current?.focus(), []);

  const weiter = async () => {
    const p = pruefeName(name);
    if (!p.ok) return setFehler(p.grund);
    if (p.name === null) return setFehler('Bitte einen Namen eingeben.');
    await setzeName(p.name);
    void synchronisiere();
    onFertig();
  };

  return (
    <div class="nm fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dein Name"
        class="glas-stark w-full max-w-md rounded-t-[28px] p-5 text-eis sm:rounded-[28px]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <h2 class="font-display text-[28px] uppercase leading-none tracking-wide">Wie heißt du?</h2>
        <p class="mt-2 text-sm text-dunst">
          Dein Name steht öffentlich neben deinen Bewertungen. Ein Spitzname reicht, besser kein voller echter Name. Einmal eingeben, dann gilt er auf diesem Gerät.
        </p>
        <input
          ref={feld}
          class="glas mt-4 w-full rounded-2xl px-4 py-3 text-base text-eis outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70"
          type="text"
          maxLength={GRENZEN.name}
          autocomplete="nickname"
          enterkeyhint="done"
          placeholder="Name oder Spitzname"
          aria-label="Name oder Spitzname"
          value={name}
          onInput={(e) => {
            setName((e.target as HTMLInputElement).value);
            setFehler('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && void weiter()}
        />
        {fehler && <p class="mt-2 text-sm text-wein-400">{fehler}</p>}
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => void weiter()}
            class="flex-1 rounded-full px-5 py-3 font-semibold text-[#1a1020]"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            Speichern und bewerten
          </button>
          <button type="button" onClick={onZu} class="glas rounded-full px-4 py-3 text-sm text-dunst hover:text-eis">
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}
