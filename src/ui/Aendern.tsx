// Eigene Bewertung nachträglich ändern: Sterne, Preis, Größe, Notiz. Stand, Ort und Zeitpunkt bleiben. Die Änderung geht beim nächsten Abgleich zum Server.
import { useMemo, useState } from 'preact/hooks';
import { db, type LokalerEintrag } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { aktuelleSprache, kriteriumLabel, t } from '../i18n';
import { euro, sterneText } from '../lib/format';
import { KRITERIEN, type Kriterium, type Noten } from '../lib/modell';
import { ortText } from '../lib/orte';
import { berechnePreisLeistung, MENGEN, PREIS_MAX, PREIS_MIN, referenzPreis, vergleichbar } from '../lib/preisleistung';
import { bewerte } from '../lib/scoring';
import { useEintraege, useGeraetId, useGewichte } from './daten';
import { Sterne } from './nacht/SterneWert';
import { NotenZeile } from './NotenZeile';
import { ANKER, MARKTLISTE } from './stammdaten';

function leseEuro(text: string): number | undefined {
  const x = Number(text.trim().replace(',', '.').replace(/\s*€$/, ''));
  return Number.isFinite(x) && x >= PREIS_MIN && x <= PREIS_MAX ? Math.round(x * 100) / 100 : undefined;
}

function Formular({ e, bestand }: { e: LokalerEintrag; bestand: LokalerEintrag[] }) {
  const gewichte = useGewichte();
  const [noten, setNoten] = useState<Noten>({ ...e.noten });
  const [preisText, setPreisText] = useState(e.preis !== undefined ? String(e.preis).replace('.', ',') : '');
  const [menge, setMenge] = useState<number | undefined>(e.menge);
  const [notiz, setNotiz] = useState(e.notiz ?? '');
  const [hilfeOffen, setHilfeOffen] = useState<Kriterium | null>(null);
  const [fehler, setFehler] = useState('');
  const preis = leseEuro(preisText);
  const stadt = e.stadt ?? undefined;
  const referenz = useMemo(() => referenzPreis(bestand, stadt, MARKTLISTE), [bestand, stadt]);
  const plAuto = useMemo(() => berechnePreisLeistung(noten, gewichte, preis, menge, referenz, e.sorte), [noten, gewichte, preis, menge, referenz, e.sorte]);
  const gesamt = useMemo(() => bewerte({ ...noten, preisLeistung: plAuto }, gewichte), [noten, plAuto, gewichte]);
  const bewertet = KRITERIEN.filter((k) => k !== 'preisLeistung' && noten[k] !== null).length;

  const speichern = async () => {
    if (bewertet === 0) return setFehler(t('Mindestens ein Stern ist nötig.'));
    if (preis === undefined) return setFehler(t('Der Preis fehlt oder passt nicht (zwischen {a} und {b} Euro).', { a: PREIS_MIN, b: PREIS_MAX }));
    setFehler('');
    const neu: Partial<LokalerEintrag> = { noten: { ...noten, preisLeistung: plAuto }, preis, menge, notiz: notiz.trim() || undefined };
    // Noch nicht beim Server (offen oder abgelehnt): geht als ganze Bewertung (noch einmal) hin. Schon dort: als Änderung.
    if (e.sync === 'fertig') Object.assign(neu, { aenderung: true, syncFehler: undefined });
    else Object.assign(neu, { sync: 'offen', syncFehler: undefined });
    await db.eintraege.update(e.id, neu);
    void synchronisiere();
    location.hash = `#/becher/${encodeURIComponent(e.id)}`;
  };

  return (
    <div class="erf">
      <div class="kopf-bewerten">
        <a href="#/meine" class="kopf-zurueck">
          {t('Abbrechen')}
        </a>
      </div>
      <h1 class="wo-titel">{t('Bewertung ändern')}</h1>
      <p class="m-0 mb-3 text-[17px] text-eis">
        <b>{e.stand}</b>
        <span class="block text-sm text-dunst">{ortText(MARKTLISTE, e)}</span>
      </p>

      <section class="preis-block gesetzt" aria-label={t('Preis')}>
        <div class="preis-kopf">
          <span class="preis-titel">{t('Preis der Tasse')}</span>
          <select class="preis-groesse" aria-label={t('Größe der Tasse')} value={menge ?? ''} onChange={(ev) => setMenge((ev.target as HTMLSelectElement).value ? Number((ev.target as HTMLSelectElement).value) : undefined)}>
            <option value="">{t('Größe')} 0,2 l</option>
            {MENGEN.map((m) => (
              <option value={m}>{String(m).replace('.', aktuelleSprache() === 'en' ? '.' : ',')} l</option>
            ))}
          </select>
        </div>
        <div class="preis-zeile">
          <label class="preis-eingabe">
            <input type="text" inputMode="decimal" autocomplete="off" maxLength={6} placeholder="0,00" aria-label={t('Preis in Euro, ohne Pfand')} value={preisText} onInput={(ev) => setPreisText((ev.target as HTMLInputElement).value)} />
            <span aria-hidden="true">€</span>
          </label>
        </div>
      </section>

      <section class="noten" aria-label={t('Sterne')}>
        <p class="noten-kopf">{t('Sterne')}</p>
        {KRITERIEN.map((k) => (
          <NotenZeile
            key={k}
            name={kriteriumLabel(ANKER[k].label)}
            wert={k === 'preisLeistung' ? plAuto : noten[k]}
            onWert={k === 'preisLeistung' ? undefined : (n) => setNoten((x) => ({ ...x, [k]: n }))}
            auto={k === 'preisLeistung'}
            offen={hilfeOffen === k}
            onHilfe={() => setHilfeOffen(hilfeOffen === k ? null : k)}
            anker={Object.entries(ANKER[k].anker)
              .map(([stufe, text]) => ({ stufe: Number(stufe), text: t(text) }))
              .filter((a) => Number.isFinite(a.stufe))
              .sort((x, y) => y.stufe - x.stufe)}
            hilfeText={
              k === 'preisLeistung'
                ? !vergleichbar(e.sorte)
                  ? t('Alkoholfreies und Feuerzangenbowle lassen sich preislich nicht vergleichen: keine Preis-Leistung.')
                  : t('¼ Stern je Euro über oder unter dem üblichen Preis ({ref}{stadt}).', { ref: euro(referenz), stadt: stadt ? ` ${t('in')} ${stadt}` : '' })
                : undefined
            }
          />
        ))}
      </section>

      <label class="mt-3 grid gap-1.5 text-[15px] text-dunst">
        {t('Notiz')}
        <input class="feld min-h-[48px] text-[17px]" type="text" maxLength={200} value={notiz} onInput={(ev) => setNotiz((ev.target as HTMLInputElement).value)} />
      </label>

      <footer class="fuss">
        {fehler && (
          <p role="alert" class="m-0 mb-2 w-full text-sm font-semibold text-[var(--warnung)]">
            {fehler}
          </p>
        )}
        <div class="messwert" aria-live="polite">
          <span class="kopfzeile">
            <span class={gesamt.gesamt === null ? 'gesamt leer' : 'gesamt'}>{sterneText(gesamt.gesamt)}</span>
            <Sterne wert={gesamt.gesamt} groesse={16} />
          </span>
        </div>
        <button type="button" class="speichern" disabled={bewertet === 0} onClick={() => void speichern()}>
          {t('Änderung speichern')}
        </button>
      </footer>
    </div>
  );
}

export function Aendern({ id }: { id: string }) {
  const alle = useEintraege();
  const ich = useGeraetId();
  if (!alle) return null;
  const e = alle.find((x) => x.id === id);
  if (!e || e.geraet !== ich || e.sync === 'bestand') {
    return (
      <div class="nm">
        <div class="glas rounded-3xl p-6 text-center">
          <p class="m-0 text-[17px] text-eis">{t('Diese Bewertung kannst du nicht ändern.')}</p>
          <a href="#/meine" class="mt-3 inline-block font-semibold text-gold-300 no-underline">
            {t('Zu meinen Bewertungen')}
          </a>
        </div>
      </div>
    );
  }
  return <Formular e={e} bestand={alle} />;
}
