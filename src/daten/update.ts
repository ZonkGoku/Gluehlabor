// Updates der installierten App. Eine neue Version wird sofort eingespielt, nur
// nicht während der Erfassung: dort wartet sie, bis man die Erfassung verlässt.
// Entwurf und lokale Becher bleiben beim Neuladen erhalten (IndexedDB/localStorage).

import { registerSW } from 'virtual:pwa-register';

const STUNDE = 60 * 60 * 1000;

export function starteUpdates(): void {
  let wartet = false;
  const inErfassung = () => location.hash.startsWith('#/erfassen');

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      wartet = true;
      if (!inErfassung()) void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Nach dem Start und beim Zurückkehren in die App nach einer neuen Version fragen.
      const pruefe = () => void registration.update().catch(() => undefined);
      setInterval(pruefe, STUNDE);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pruefe();
      });
    },
  });

  // Erfassung verlassen: wartendes Update jetzt einspielen.
  addEventListener('hashchange', () => {
    if (wartet && !inErfassung()) void updateSW(true);
  });
}
