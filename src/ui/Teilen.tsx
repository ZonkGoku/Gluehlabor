// QR-Code zum gemeinsamen Bewerten. Funktioniert ohne Netz: Die Stammdaten stecken im Link.
import { useEffect, useState } from 'preact/hooks';
import { db } from '../daten/db';
import { leseEntwurf } from '../daten/entwurf';
import { synchronisiere } from '../daten/sync';
import { besuchsLink, type Besuch } from '../lib/besuch';
import { MARKE } from '../marke';
import { anzeigeName } from '../lib/community';
import { stadtVon, zerlegeFreienMarkt } from '../lib/orte';
import { useLive } from './hooks';
import { Qr } from './Qr';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';

function queryDerAdresse(): URLSearchParams {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

/** Besuch aus dem Entwurf oder aus einem schon gespeicherten Becher (?e=<id>). */
async function ladeBesuch(): Promise<Besuch | null> {
  const eId = queryDerAdresse().get('e');
  if (eId) {
    const e = await db.eintraege.get(eId);
    if (!e?.besuchId) return null;
    return { id: e.besuchId, stand: e.stand, markt: e.markt, stadt: stadtVon(MARKTLISTE, e) ?? undefined, sorte: e.sorte };
  }
  const d = leseEntwurf();
  if (!d?.besuchId || !d.stand.trim()) return null;
  const frei = d.marktFrei ? zerlegeFreienMarkt(d.markt) : { markt: d.markt.trim() };
  const stadt = d.stadt ?? ('stadt' in frei ? frei.stadt : undefined) ?? stadtVon(MARKTLISTE, { markt: frei.markt }) ?? undefined;
  return { id: d.besuchId, stand: d.stand.trim(), markt: frei.markt, stadt, sorte: d.sorte };
}

export function Teilen() {
  const besuch = useLive(ladeBesuch, [location.hash], undefined as Besuch | null | undefined);
  const mitDabei = useLive(
    async () => (besuch ? (await db.eintraege.where('besuchId').equals(besuch.id).toArray()) : []),
    [besuch?.id],
    [],
  );
  const [kopiert, setKopiert] = useState(false);

  // Solange der QR-Code offen ist, kurz nachfragen: Die Mitbewertenden sollen schnell auftauchen.
  // (Die öffentliche Liste wird am Rand 5 s zwischengespeichert, deshalb nicht öfter.)
  useEffect(() => {
    const t = setInterval(() => void synchronisiere(), 10_000);
    return () => clearInterval(t);
  }, []);
  const zurueck = queryDerAdresse().get('e') ? '#/' : '#/erfassen';

  if (besuch === undefined) return null;
  if (besuch === null) {
    return (
      <main class="fokus">
        <div class="karte leer">
          <b>Hier gibt es noch nichts zu teilen.</b>
          Trag zuerst den Stand ein, dann erscheint der QR-Code.
          <p style={{ margin: '14px 0 0' }}>
            <a class="pillknopf" href="#/erfassen">
              Zur Erfassung
            </a>
          </p>
        </div>
      </main>
    );
  }

  const link = besuchsLink(location.origin + location.pathname, besuch);
  const teile = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${MARKE.name}: ${besuch.stand}`, text: `Bewerte mit mir: ${besuch.stand}`, url: link });
        return;
      }
    } catch {
      /* abgebrochen oder nicht möglich: dann kopieren */
    }
    try {
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      window.prompt?.('Link kopieren', link);
    }
  };

  const namen = mitDabei.map((e) => anzeigeName(e));
  return (
    <main class="fokus">
      <p class="eyebrow">Gemeinsam bewerten</p>
      <h1 class="fokus-titel">{besuch.stand}</h1>
      <p class="fokus-unter">
        {besuch.markt}
        {besuch.stadt ? ` · ${besuch.stadt}` : ''}
      </p>

      <div class="qr-box">
        <Qr text={link} titel={`QR-Code zum Mitbewerten bei ${besuch.stand}`} />
      </div>
      <p class="fokus-hinweis">
        Die anderen scannen den Code mit der Handykamera. Es öffnet sich das {MARKE.name} mit diesem Stand, jeder bewertet für
        sich. Dafür braucht niemand ein Konto oder eine App.
      </p>

      <div class="knopfreihe" style={{ justifyContent: 'center' }}>
        <button class="knopf primaer" onClick={() => void teile()}>
          <Symbol name="plus" groesse={16} /> {kopiert ? 'Link kopiert' : 'Link teilen'}
        </button>
        <a class="knopf" href={zurueck} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          Fertig
        </a>
      </div>

      {namen.length > 0 && (
        <p class="fokus-hinweis" aria-live="polite">
          <b>{namen.length === 1 ? '1 Bewertung' : `${namen.length} Bewertungen`} zu diesem Besuch:</b> {namen.join(', ')}
        </p>
      )}
    </main>
  );
}
