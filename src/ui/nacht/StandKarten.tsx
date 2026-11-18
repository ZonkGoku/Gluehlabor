// Stände in den Karten und Zeilen der Ansichten: dieselben Bausteine wie bei einzelnen Bechern, nur mit Stand-Werten.
import { t as tt, tn } from '../../i18n';
import { zahl2 } from '../../lib/format';
import { ortText } from '../../lib/orte';
import { standAlsZeile, type Quelle, type Stand } from '../../lib/staende';
import { MARKTLISTE } from '../stammdaten';
import { RangZeile } from './RangZeile';
import { TopKarte } from './Ticket';

export const standHref = (s: Stand) => `#/stand/${encodeURIComponent(s.id)}`;

/** „Prüfstelle 6.33 · Community 7.10": beide Seiten, wo es sie gibt. */
export function seitenText(s: Stand): string {
  const teile: string[] = [];
  if (s.pruefstelle.gesamt !== null) teile.push(`${tt('Prüfstelle')} ${zahl2(s.pruefstelle.gesamt)}`);
  if (s.community.gesamt !== null) teile.push(`${tt('Community')} ${zahl2(s.community.gesamt)}`);
  return teile.join(' · ');
}

const stempel = (s: Stand) => tn(s.wert.anzahl, '{n} Bewertung', '{n} Bewertungen');

export function StandTopKarte({ stand, klein, quelle = 'alle', hinweis, klasse, titel, ort, ohneLink }: { stand: Stand; ohneLink?: boolean; klein?: boolean; quelle?: Quelle; hinweis?: string; klasse?: string; titel?: string; ort?: string }) {
  const zeile = standAlsZeile(stand);
  return (
    <TopKarte
      zeile={zeile}
      ort={ort ?? ortText(MARKTLISTE, zeile.eintrag)}
      titel={titel}
      hinweis={[hinweis, stand.vorlaeufig ? tt('vorläufig') : null].filter(Boolean).join(' · ') || undefined}
      klein={klein}
      klasse={klasse}
      href={standHref(stand)}
      ohneLink={ohneLink}
      teilenLink={standHref(stand)}
      stempel={stempel(stand)}
      siegel={stand.pruefstelle.anzahl > 0}
      von={quelle === 'alle' ? seitenText(stand) || tt('Alle Bewertungen') : quelle === 'pruefstelle' ? tt('Wertung der Prüfstelle') : tt('Wertung der Community')}
    />
  );
}

export function StandZeile({ stand }: { stand: Stand }) {
  const zeile = standAlsZeile(stand);
  return <RangZeile zeile={zeile} ort={ortText(MARKTLISTE, zeile.eintrag)} href={standHref(stand)} zusatz={stempel(stand)} siegel={stand.pruefstelle.anzahl > 0} />;
}
