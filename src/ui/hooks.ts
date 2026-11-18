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

/** Hash-Route, z. B. "erfassen" für #/erfassen. */
export function useRoute(): string {
  const lese = () => location.hash.replace(/^#\/?/, '').split('?')[0];
  const [route, setRoute] = useState(lese);
  useEffect(() => {
    const h = () => setRoute(lese());
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  return route;
}
