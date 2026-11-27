// Stände in den Karten und Zeilen der Ansichten: dieselben Bausteine wie bei einzelnen Bechern, nur mit Stand-Werten.
import { t as tt, tn } from '../../i18n';
import { euro, sterneText } from '../../lib/format';
import { ortText } from '../../lib/orte';
import { dealAlsZeile, standAlsZeile, type Quelle, type Stand } from '../../lib/staende';
import { fotoAdresse } from '../../daten/fotos';
import { MARKTLISTE } from '../stammdaten';
import { RangZeile } from './RangZeile';
import { TopKarte } from './Ticket';

export const standHref = (s: Stand) => `#/stand/${encodeURIComponent(s.id)}`;

/** „Prüfstelle 6.33 · Community 7.10": beide Seiten, wo es sie gibt. */
export function seitenText(s: Stand): string {
  const teile: string[] = [];
  if (s.pruefstelle.gesamt !== null) teile.push(`${tt('Prüfstelle')} ${sterneText(s.pruefstelle.gesamt)}`);
  if (s.community.gesamt !== null) teile.push(`${tt('Community')} ${sterneText(s.community.gesamt)}`);
  return teile.join(' · ');
}

const stempel = (s: Stand) => tn(s.wert.anzahl, '{n} Bewertung', '{n} Bewertungen');

export function StandTopKarte({ stand, klein, quelle = 'alle', hinweis, klasse, titel, ort, ohneLink, schlicht }: { stand: Stand; schlicht?: boolean; ohneLink?: boolean; klein?: boolean; quelle?: Quelle; hinweis?: string; klasse?: string; titel?: string; ort?: string }) {
  const zeile = standAlsZeile(stand);
  return (
    <TopKarte
      zeile={zeile}
      ort={ort ?? (schlicht ? (stand.stadt ?? ortText(MARKTLISTE, zeile.eintrag)) : ortText(MARKTLISTE, zeile.eintrag))}
      titel={titel}
      hinweis={schlicht ? stempel(stand) : [hinweis, stand.vorlaeufig ? tt('wenige Bewertungen') : null].filter(Boolean).join(' · ') || undefined}
      klein={klein}
      klasse={klasse}
      href={standHref(stand)}
      ohneLink={ohneLink}
      schlicht={schlicht}
      teilenLink={standHref(stand)}
      stempel={stempel(stand)}
      siegel={stand.pruefstelle.anzahl > 0}
      deal={stand.deal.top}
      von={quelle === 'alle' ? seitenText(stand) || tt('Alle Bewertungen') : quelle === 'pruefstelle' ? tt('Wertung der Prüfstelle') : tt('Wertung der Community')}
    />
  );
}

export function StandZeile({ stand }: { stand: Stand }) {
  const zeile = standAlsZeile(stand);
  // Das neueste Foto der Community (vom Server) als kleine Vorschau
  const mitFoto = stand.bewertungen.find((e) => e.foto);
  return <RangZeile zeile={zeile} ort={stand.stadt ?? ortText(MARKTLISTE, zeile.eintrag)} href={standHref(stand)} anzahl={stand.wert.anzahl} siegel={stand.pruefstelle.anzahl > 0} deal={stand.deal.top} bild={mitFoto ? fotoAdresse(mitFoto, true) : undefined} />;
}

/** Zeile der Top-Deals-Liste: Preis-Leistung statt Gesamtnote, dazu der übliche Preis. */
export function DealZeile({ stand }: { stand: Stand }) {
  const zeile = dealAlsZeile(stand);
  const preis = stand.preis.median !== null ? `${euro(stand.preis.median)} ${tt('je 0,2 l')}` : null;
  return (
    <RangZeile
      zeile={zeile}
      ort={[stand.stadt ?? ortText(MARKTLISTE, zeile.eintrag), preis].filter(Boolean).join(' · ')}
      href={standHref(stand)}
      anzahl={stand.wert.anzahl}
      siegel={stand.pruefstelle.anzahl > 0}
      deal={stand.deal.top}
    />
  );
}
