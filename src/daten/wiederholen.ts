// „Nochmal wie eben“: Der nächste Becher am selben Stand mit einem Tipp. Es ist eine echte Bewertung (zählt im Rennen und für den Stand),
// nur mit den Angaben der letzten vorbelegt: Stand, Ort, Preis, Größe, Sorte und Sterne. Ohne Foto und Notiz.
import { abendDatum, naechsteBecherNr } from '../lib/abend';
import type { Eintrag } from '../lib/modell';
import { db, neueUuid, speichereNeuenEintrag, type LokalerEintrag } from './db';
import { synchronisiere } from './sync';

export async function wiederholeBecher(vorlage: LokalerEintrag): Promise<string> {
  const jetzt = new Date();
  const heute = abendDatum(jetzt);
  const heutige = await db.eintraege.where('datum').equals(heute).toArray();
  const eintrag: Eintrag = {
    id: neueUuid(),
    stand: vorlage.stand,
    markt: vorlage.markt,
    saison: jetzt.getFullYear(),
    datum: heute,
    noten: { ...vorlage.noten },
    erstelltAm: jetzt.getTime(),
    becherNr: naechsteBecherNr(heutige, heute),
  };
  if (vorlage.stadt) eintrag.stadt = vorlage.stadt;
  if (vorlage.sorte) eintrag.sorte = vorlage.sorte;
  if (vorlage.preis !== undefined) eintrag.preis = vorlage.preis;
  if (vorlage.menge !== undefined) eintrag.menge = vorlage.menge;
  if (vorlage.besuchId) eintrag.besuchId = vorlage.besuchId;
  await speichereNeuenEintrag(eintrag);
  navigator.vibrate?.([20, 40, 20]);
  void synchronisiere();
  return eintrag.id;
}
