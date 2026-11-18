import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

/** Abonniert eine Dexie-Abfrage; rendert bei jeder Datenänderung neu. */
export function useLive<T>(abfrage: () => Promise<T>, deps: unknown[], start: T): T {
  const [wert, setWert] = useState<T>(start);
  useEffect(() => {
    const sub = liveQuery(abfrage).subscribe({ next: setWert, error: (e) => console.error(e) });
    return () => sub.unsubscribe();
  }, deps);
  return wert;
}

/**
 * Hash-Route, z. B. "erfassen" für #/erfassen. Rendert bei jeder Änderung des ganzen Hashs neu, auch wenn nur
 * die Angaben nach dem "?" wechseln (zweiter QR-Code, anderer Becher), damit Seiten, die sie lesen, nie veralten.
 */
export function useRoute(): string {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const h = () => setHash(location.hash);
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  return hash.replace(/^#\/?/, '').split('?')[0];
}
