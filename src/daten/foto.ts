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

/** Blob → Base64 (ohne „data:…;base64,“). */
function alsBase64(b: Blob): Promise<string> {
  return new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => fehler(r.error);
    r.readAsDataURL(b);
  });
}

/** Zeichnet das Bild neu (das entfernt Ortsangaben und andere EXIF-Daten) und liefert JPEG in einer Größe, die der Server annimmt. */
async function jpegBis(bild: ImageBitmap, kante: number, maxBytes: number, qualitaeten: number[]): Promise<Blob> {
  const f = Math.min(1, kante / Math.max(bild.width, bild.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bild.width * f));
  canvas.height = Math.max(1, Math.round(bild.height * f));
  canvas.getContext('2d')!.drawImage(bild, 0, 0, canvas.width, canvas.height);
  let letztes: Blob | null = null;
  for (const q of qualitaeten) {
    letztes = await new Promise<Blob>((ok, fehler) => canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('toBlob'))), 'image/jpeg', q));
    if (letztes.size <= maxBytes) return letztes;
  }
  throw new Error('Das Foto ist zu groß.');
}

/** Foto fürs Hochladen: groß (höchstens 1024 px, unter 390 KB) und klein (240 px, unter 38 KB), beide als Base64-JPEG. Wirft, wenn das Bild nicht lesbar ist. */
export async function bereiteFotoFuerUpload(datei: Blob): Promise<{ gross: string; klein: string }> {
  const bild = await createImageBitmap(datei, { imageOrientation: 'from-image' });
  try {
    const gross = await jpegBis(bild, 1024, 390_000, [0.72, 0.6, 0.5, 0.4]);
    const klein = await jpegBis(bild, 240, 38_000, [0.65, 0.5, 0.4]);
    return { gross: await alsBase64(gross), klein: await alsBase64(klein) };
  } finally {
    bild.close();
  }
}
