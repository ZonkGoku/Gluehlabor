// Fotos werden vor dem Speichern verkleinert: Speicher und Upload im Funkloch.

const MAX_KANTE = 1280;

export async function verkleinereFoto(datei: Blob): Promise<Blob> {
  try {
    const bild = await createImageBitmap(datei, { imageOrientation: 'from-image' });
    const f = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bild.width * f);
    canvas.height = Math.round(bild.height * f);
    canvas.getContext('2d')!.drawImage(bild, 0, 0, canvas.width, canvas.height);
    bild.close();
    return await new Promise<Blob>((ok, fehler) =>
      canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('toBlob'))), 'image/jpeg', 0.75),
    );
  } catch {
    return datei; // lieber unverkleinert als gar nicht
  }
}
