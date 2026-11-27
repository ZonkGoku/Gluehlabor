// Das Fahrer-Foto: ein Bild des Gesichts, das NUR auf diesem Gerät liegt und nie hochgeladen wird. Es erscheint auf dem eigenen Fahrzeug,
// andere sehen weiter nur das gewählte Fahrzeug. Gespeichert wird ein kleines, quadratisch zugeschnittenes JPEG.
import { leseEinstellung, schreibeEinstellung } from './db';

const SEITE = 160;

export const leseGesicht = () => leseEinstellung<Blob | null>('gesicht', null);

export async function setzeGesicht(datei: Blob): Promise<void> {
  const bild = await createImageBitmap(datei, { imageOrientation: 'from-image' });
  try {
    const kante = Math.min(bild.width, bild.height);
    const canvas = document.createElement('canvas');
    canvas.width = SEITE;
    canvas.height = SEITE;
    // Mitte ausschneiden, damit das Gesicht ein Quadrat füllt
    canvas.getContext('2d')!.drawImage(bild, (bild.width - kante) / 2, (bild.height - kante) / 2, kante, kante, 0, 0, SEITE, SEITE);
    const blob = await new Promise<Blob>((ok, fehler) => canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('toBlob'))), 'image/jpeg', 0.8));
    await schreibeEinstellung('gesicht', blob);
  } finally {
    bild.close();
  }
}

export const loescheGesicht = () => schreibeEinstellung('gesicht', null);
