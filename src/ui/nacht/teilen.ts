// Teilen: Web-Share-Dialog des Telefons, sonst Link in die Zwischenablage.
export async function teileLink(titel: string, text: string, hash: string): Promise<'geteilt' | 'kopiert' | 'abgebrochen'> {
  const url = `${location.origin}${location.pathname}${hash}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: titel, text, url });
      return 'geteilt';
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'kopiert';
  } catch {
    return 'abgebrochen';
  }
}
