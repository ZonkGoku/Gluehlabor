// Das Ergebnis eines Schlittenrennens als Bild für Stories (1080 × 1920, immer im Nachtlook), gezeichnet auf einer Canvas wie die Sammelkarte.
import { FAHRZEUGE, FAHRZEUG_ANZAHL } from '../../lib/fahrzeuge';
import { SCHLITTEN_FARBEN, type Bahn } from '../../lib/rennen';
import { t as uebersetze } from '../../i18n';

const B = 1080;
const H = 1920;

export interface RennenBildDaten {
  rennen: string;
  ziel: number;
  /** Platz 1 bis 3, nach Platz sortiert */
  podest: Bahn[];
  /** Eigener Platz (null: nicht dabei) */
  mein: Bahn | null;
  link: string;
}

/** Zeichnet ein Fahrzeug (Beschreibung in lib/fahrzeuge.ts) mit der linken oberen Ecke bei (x, y). */
function fahrzeug(c: CanvasRenderingContext2D, x: number, y: number, s: number, farbe: string, nr: number): void {
  const f = FAHRZEUGE[((nr % FAHRZEUG_ANZAHL) + FAHRZEUG_ANZAHL) % FAHRZEUG_ANZAHL];
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const t of f.teile) {
    const farbeTeil = t.farbe ?? farbe;
    const pfad = new Path2D();
    if (t.kreis) pfad.arc(t.kreis[0], t.kreis[1], t.kreis[2], 0, Math.PI * 2);
    else if (t.ellipse) pfad.ellipse(t.ellipse[0], t.ellipse[1], t.ellipse[2], t.ellipse[3], 0, 0, Math.PI * 2);
    else if (t.d) pfad.addPath(new Path2D(t.d));
    if (!t.nurStrich) {
      c.fillStyle = t.fuellung ?? farbeTeil;
      c.fill(pfad);
    }
    if (t.strich !== undefined) {
      c.strokeStyle = farbeTeil;
      c.lineWidth = t.strich;
      c.stroke(pfad);
    }
  }
  c.restore();
}

function ladeLogo(): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = './logo.png';
  });
}

export async function erzeugeRennenBild(d: RennenBildDaten): Promise<Blob> {
  await Promise.all([document.fonts.load('120px Anton'), document.fonts.load('40px "IBM Plex Mono"'), document.fonts.load('40px "IBM Plex Sans"')]);
  const logo = await ladeLogo();
  const cv = document.createElement('canvas');
  cv.width = B;
  cv.height = H;
  const c = cv.getContext('2d')!;

  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060919');
  g.addColorStop(0.55, '#0a1030');
  g.addColorStop(1, '#0b0d24');
  c.fillStyle = g;
  c.fillRect(0, 0, B, H);
  const glow = (x: number, y: number, r: number, farbe: string) => {
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, farbe);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(0, 0, B, H);
  };
  glow(960, 140, 760, 'rgba(240,52,79,.30)');
  glow(60, 1860, 900, 'rgba(255,138,61,.26)');
  glow(540, 820, 820, 'rgba(40,56,140,.30)');

  // Konfetti
  for (let i = 0; i < 60; i++) {
    c.save();
    c.translate((i * 197) % B, (i * 331) % 900);
    c.rotate((i * 41) % 360);
    c.fillStyle = SCHLITTEN_FARBEN[i % SCHLITTEN_FARBEN.length];
    c.globalAlpha = 0.85;
    c.fillRect(0, 0, 14, 26);
    c.restore();
  }

  c.textAlign = 'center';
  c.fillStyle = '#ffc857';
  c.font = '34px "IBM Plex Mono"';
  c.fillText(uebersetze('Schlittenfahren').toUpperCase().split('').join(' '), B / 2, 190);
  c.fillStyle = '#ffffff';
  c.font = '150px Anton';
  const titel = d.mein ? (d.mein.platz === 1 ? uebersetze('Gewonnen!') : uebersetze('Platz {n}', { n: d.mein.platz })) : uebersetze('Das Ergebnis');
  c.fillText(titel.toUpperCase(), B / 2, 400);
  c.fillStyle = 'rgba(255,255,255,.78)';
  c.font = '48px "IBM Plex Sans"';
  c.fillText(d.rennen, B / 2, 480, 900);

  // Podest 2 · 1 · 3
  const spalten = [
    { b: d.podest[1], h: 280, x: 210, platz: 2, farbe: '#b8c2d6' },
    { b: d.podest[0], h: 400, x: 540, platz: 1, farbe: '#ffc857' },
    { b: d.podest[2], h: 200, x: 870, platz: 3, farbe: '#d9915a' },
  ];
  const boden = 1380;
  for (const s of spalten) {
    c.fillStyle = s.farbe;
    c.fillRect(s.x - 150, boden - s.h, 300, s.h);
    c.fillStyle = '#1a1020';
    c.font = '120px Anton';
    c.fillText(String(s.platz), s.x, boden - s.h + 130);
    if (s.b) {
      fahrzeug(c, s.x - 100, boden - s.h - 160, 4.8, SCHLITTEN_FARBEN[s.b.farbe % SCHLITTEN_FARBEN.length], s.b.fahrzeug);
      c.fillStyle = '#ffffff';
      c.font = '44px "IBM Plex Sans"';
      c.fillText(s.b.kamel, s.x, boden - s.h - 190, 290);
      c.fillStyle = 'rgba(255,255,255,.65)';
      c.font = '34px "IBM Plex Mono"';
      c.fillText(`${s.b.schritte}/${d.ziel}`, s.x, boden + 56);
    }
  }

  if (logo) c.drawImage(logo, B / 2 - 90, 1560, 180, 180);
  c.fillStyle = '#ffffff';
  c.font = '64px Anton';
  c.fillText('GLÜHLABOR', B / 2, 1810);
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.font = '30px "IBM Plex Mono"';
  c.fillText(d.link.replace(/^https?:\/\//, '').replace(/#.*$/, ''), B / 2, 1862);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht erzeugt werden'))), 'image/png'));
}

export async function teileRennenBild(d: RennenBildDaten): Promise<'geteilt' | 'gespeichert' | 'abgebrochen'> {
  try {
    const blob = await erzeugeRennenBild(d);
    const name = 'gluehlabor-schlittenfahren.png';
    const datei = new File([blob], name, { type: 'image/png' });
    const text = d.mein?.platz === 1 ? uebersetze('Ich habe {name} gewonnen!', { name: d.rennen }) : uebersetze('Mein Ergebnis bei {name}', { name: d.rennen });
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], title: 'Glühlabor', text: `${text} ${d.link}` });
      return 'geteilt';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'gespeichert';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'abgebrochen';
    console.error(e);
    return 'abgebrochen';
  }
}
