// „Was fehlt dir?“: ein Textfeld, ein Knopf. Die Prüfstelle sieht darunter die eingegangenen Rückmeldungen.
import { useEffect, useState } from 'preact/hooks';
import { leseEinstellung } from '../daten/db';
import { ladeRueckmeldungen, rueckmeldungFehler, sendeRueckmeldung, type Rueckmeldung } from '../daten/rueckmeldung';
import { HAT_SERVER } from '../daten/config';
import { t } from '../i18n';
import { Betreiber } from './bausteine';
import { useLive } from './hooks';

export function Feedback() {
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const [text, setText] = useState('');
  const [zustand, setZustand] = useState<'schreiben' | 'sendet' | 'danke'>('schreiben');
  const [fehler, setFehler] = useState('');
  const [liste, setListe] = useState<Rueckmeldung[] | null>(null);
  useEffect(() => {
    if (pruefstelle) ladeRueckmeldungen().then(setListe, () => setListe([]));
  }, [pruefstelle]);

  const senden = async () => {
    setZustand('sendet');
    setFehler('');
    try {
      await sendeRueckmeldung(text.trim(), (document.referrer && '') || null);
      setText('');
      setZustand('danke');
    } catch (err) {
      setFehler(rueckmeldungFehler(err));
      setZustand('schreiben');
    }
  };

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Deine Meinung')}</p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Was fehlt dir?')}</h1>
        <p class="mt-3 text-dunst">{t('Was war unklar, was nervt, was wünschst du dir? Schreib es kurz auf. Wir lesen alles.')}</p>
      </div>
      {!HAT_SERVER ? (
        <p class="glas rounded-3xl p-5 text-dunst">{t('Diese Version arbeitet nur lokal. Rückmeldungen gehen nur über gluehlabor.de.')}</p>
      ) : zustand === 'danke' ? (
        <div class="glas rahmen-licht rounded-3xl p-5" role="status">
          <p class="m-0 font-display text-2xl uppercase tracking-wide text-eis">{t('Danke!')}</p>
          <p class="mt-2 text-dunst">{t('Deine Rückmeldung ist angekommen.')}</p>
          <button type="button" class="glas mt-4 min-h-[44px] rounded-full px-5 font-semibold text-eis" onClick={() => setZustand('schreiben')}>
            {t('Noch etwas schreiben')}
          </button>
        </div>
      ) : (
        <div class="glas rounded-3xl p-5">
          <label for="rueck-text" class="mb-2 block font-semibold text-eis">{t('Deine Rückmeldung')}</label>
          <textarea
            id="rueck-text"
            class="min-h-[140px] w-full rounded-2xl border border-[var(--nm-bedienung)] bg-flaeche p-3 text-base text-eis"
            maxLength={1000}
            value={text}
            onInput={(ev) => setText((ev.target as HTMLTextAreaElement).value)}
          />
          <p class="mt-1 text-xs text-dunst">{t('Anonym. Bitte keine persönlichen Daten schreiben.')}</p>
          {fehler && <p role="alert" class="mt-2 text-sm font-semibold text-[var(--warnung)]">{fehler}</p>}
          <button
            type="button"
            disabled={text.trim().length < 3 || zustand === 'sendet'}
            onClick={() => void senden()}
            class="mt-3 min-h-[52px] w-full rounded-full px-6 font-semibold text-[#1a1020] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
          >
            {zustand === 'sendet' ? t('Wird gesendet …') : t('Senden')}
          </button>
        </div>
      )}
      {pruefstelle && liste && (
        <section class="mt-6" aria-label={t('Eingegangene Rückmeldungen')}>
          <h2 class="etikett mb-2 !text-gold-300">{t('Eingegangen')} · {liste.length}</h2>
          <ul class="grid gap-2">
            {liste.map((r) => (
              <li class="glas rounded-2xl p-4">
                <p class="m-0 whitespace-pre-wrap break-words text-eis">{r.text}</p>
                <p class="mt-1 text-xs text-dunst">{new Date(r.erstellt_am).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Betreiber />
    </div>
  );
}
