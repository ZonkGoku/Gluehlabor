// Ortsdaten (GeoNames) nachladen: ca. 50 KB gezippt, erst wenn sie gebraucht werden (Ortssuche, Karte). Die App-Hülle bleibt klein.
import { useEffect, useState } from 'preact/hooks';
import staedteJson from '../../data/staedte.json';
import type { Koordinaten } from '../lib/karte';
import { baueOrte, type OrteDaten, type Ort } from '../lib/ortssuche';

let geladen: Promise<Ort[]> | null = null;

export function ladeOrte(): Promise<Ort[]> {
  geladen ??= import('../../data/orte.json').then((m) => baueOrte(m.default as unknown as OrteDaten));
  return geladen;
}

/** Alle Orte, sobald geladen (davor null). */
export function useOrte(): Ort[] | null {
  const [orte, setOrte] = useState<Ort[] | null>(null);
  useEffect(() => {
    let aktiv = true;
    ladeOrte().then((o) => aktiv && setOrte(o), () => undefined);
    return () => {
      aktiv = false;
    };
  }, []);
  return orte;
}

/** Koordinaten für die Karte: erst die gepflegten Städte, danach alle aus den Ortsdaten (sobald geladen). */
export function useKartenKoordinaten(): Koordinaten {
  const orte = useOrte();
  const [k, setK] = useState<Koordinaten>(staedteJson as unknown as Koordinaten);
  useEffect(() => {
    if (!orte) return;
    const alle: Koordinaten = { ...(staedteJson as unknown as Koordinaten) };
    const vorhanden = new Set(Object.keys(alle).map((n) => n.toLowerCase()));
    for (const o of orte) if (!vorhanden.has(o.name.toLowerCase())) alle[o.name] = [o.lat, o.lon];
    setK(alle);
  }, [orte]);
  return k;
}
