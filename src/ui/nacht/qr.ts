// QR-Matrix für Karten und Story-Bild. Immer schwarz auf weiß gezeichnet (siehe ui/Qr.tsx).
import qrcode from 'qrcode-generator';

/** Dunkle Module als Zeilen von Wahrheitswerten. Niedrige Fehlerkorrektur: kürzere Links ergeben gröbere, besser lesbare Module. */
export function qrModule(text: string): boolean[][] {
  const qr = qrcode(0, 'L');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}
