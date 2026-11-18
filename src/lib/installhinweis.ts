// Hinweis „Zum Home-Bildschirm hinzufügen" für iPhone und iPad im Browser. Reine Funktion.
//
// Hintergrund: Safari löscht lokale Daten von Websites nach 7 Tagen ohne Nutzung, installierte
// Web-Apps vom Home-Bildschirm sind davon ausgenommen. Gesendete Becher sind auf dem Server sicher,
// aber Geräte-Kennung, Entwurf und noch nicht gesendete Becher könnten verloren gehen.

/** Läuft die App auf iOS im Browser, also nicht als installierte Web-App? */
export function istIosImBrowser(userAgent: string, maxTouchPoints: number, standalone: boolean | undefined): boolean {
  const iphone = /iPhone|iPad|iPod/.test(userAgent);
  // iPadOS meldet sich seit iPadOS 13 als Mac, hat aber Touch
  const ipadAlsMac = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  return (iphone || ipadAlsMac) && standalone !== true;
}
