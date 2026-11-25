// Darstellung dieses Geräts: Theme (Auto, Hell, Dunkel) und Menü am Rechner (Seitenleiste oder schwebende Leiste).
// Liegt in localStorage, damit es beim Start sofort bekannt ist (kein Aufblitzen, kein Springen des Layouts).
import { useEffect, useState } from 'preact/hooks';

export type Theme = 'auto' | 'hell' | 'dunkel';
export type Menue = 'seitenleiste' | 'schwebend';

const KEY_THEME = 'gluehlabor.theme';
const KEY_MENUE = 'gluehlabor.menue';

function lies(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function schreibe(key: string, wert: string): void {
  try {
    localStorage.setItem(key, wert);
  } catch {
    /* privater Modus: gilt dann nur bis zum Neuladen */
  }
}

let theme: Theme = ((): Theme => {
  const v = lies(KEY_THEME);
  return v === 'hell' || v === 'dunkel' ? v : 'auto';
})();
let menue: Menue = lies(KEY_MENUE) === 'seitenleiste' ? 'seitenleiste' : 'schwebend';
const hoerer = new Set<() => void>();
const melde = () => hoerer.forEach((h) => h());

/** Setzt das Theme am Dokument und färbt die Browserleiste mit. */
export function wendeThemeAn(t: Theme = theme): void {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  const farben = { hell: '#FBF6F2', dunkel: '#070B1A' };
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const standard = m.media.includes('light') ? farben.hell : farben.dunkel;
    m.content = t === 'auto' ? standard : farben[t];
  });
}

/** Welches Theme gerade tatsächlich gilt (bei Auto das des Systems). */
export function aktuellesTheme(): 'hell' | 'dunkel' {
  if (theme !== 'auto') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';
}

export function setzeTheme(t: Theme): void {
  theme = t;
  schreibe(KEY_THEME, t);
  wendeThemeAn(t);
  melde();
}

export function setzeMenue(m: Menue): void {
  menue = m;
  schreibe(KEY_MENUE, m);
  melde();
}

function useStore<T>(lese: () => T): T {
  const [, neu] = useState(0);
  useEffect(() => {
    const h = () => neu((n) => n + 1);
    hoerer.add(h);
    return () => void hoerer.delete(h);
  }, []);
  return lese();
}

export const useTheme = (): Theme => useStore(() => theme);
export const useMenue = (): Menue => useStore(() => menue);

/** Media-Query als Hook, z. B. ob die Seite breit genug für die Seitenleiste ist. */
export function useMedia(abfrage: string): boolean {
  const [ok, setOk] = useState(() => matchMedia(abfrage).matches);
  useEffect(() => {
    const m = matchMedia(abfrage);
    const h = () => setOk(m.matches);
    m.addEventListener('change', h);
    h();
    return () => m.removeEventListener('change', h);
  }, [abfrage]);
  return ok;
}

/** Folgt der Systemeinstellung, solange das Theme auf Auto steht (Browserleiste). */
export function starteDarstellung(): void {
  wendeThemeAn();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'auto') melde();
  });
}
