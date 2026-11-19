// Installation als App auf dem Home-Bildschirm. Chrome und Android melden „installierbar" über ein Ereignis,
// das wir festhalten, damit ein eigener Knopf den Systemdialog öffnen kann. iPhone hat keinen solchen Dialog (nur Anleitung).

interface InstallEreignis extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let ereignis: InstallEreignis | null = null;
const hoerer = new Set<() => void>();
const melde = () => hoerer.forEach((f) => f());

export function starteInstallation(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ereignis = e as InstallEreignis;
    melde();
  });
  window.addEventListener('appinstalled', () => {
    ereignis = null;
    melde();
  });
}

export const kannInstallieren = (): boolean => ereignis !== null;

/** Läuft die App schon vom Home-Bildschirm (ohne Browserleiste)? */
export function istInstalliert(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Öffnet den Installationsdialog des Systems. true, wenn der Nutzer zugestimmt hat. */
export async function installiere(): Promise<boolean> {
  if (!ereignis) return false;
  await ereignis.prompt();
  const r = await ereignis.userChoice;
  ereignis = null;
  melde();
  return r.outcome === 'accepted';
}

export function beobachteInstallation(f: () => void): () => void {
  hoerer.add(f);
  return () => hoerer.delete(f);
}
