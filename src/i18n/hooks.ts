import { useEffect, useState } from 'preact/hooks';
import { abonniereSprache, aktuelleSprache, type Sprache } from './index';

/** Rendert die Ansicht neu, wenn die Sprache wechselt. */
export function useSprache(): Sprache {
  const [s, setS] = useState(aktuelleSprache);
  useEffect(() => abonniereSprache(setS), []);
  return s;
}
