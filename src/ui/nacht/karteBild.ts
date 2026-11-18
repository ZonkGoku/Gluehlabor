// Die Karte als Bild für Instagram- und TikTok-Stories (1080 × 1920, immer im Nachtlook, egal welches Theme gerade gilt).
// Gezeichnet wird direkt auf einer Canvas statt per Bildschirmfoto: gleiche Qualität auf jedem Gerät, keine zusätzliche Bibliothek.
import type { Zeile } from '../../lib/auswertung';
import { anzeigeName, istPruefstelle } from '../../lib/community';
import { zahl2 } from '../../lib/format';
import { kurzId } from './Ticket';

export interface KartenDaten {
  rang: number | null;
  stand: string;
  ort: string;
  gesamt: number | null;
  gluehwein: number | null;
  drumherum: number | null;
  urteil: string | null;
  pruefstelle: boolean;
  saison: number;
  id: string;
  von: string;
  /** Stempel eines Stands statt Prüfstelle/Community, z. B. 12 Bewertungen. */
  stempel?: string;
}

export function kartenDaten(z: Zeile, ort: string, titel?: string, stand?: { stempel: string; von?: string }): KartenDaten {
  const pruef = stand ? false : istPruefstelle(z.eintrag);
  return {
    rang: z.rang,
    stand: titel ?? z.eintrag.stand,
    ort,
    gesamt: z.wertung.gesamt,
    gluehwein: z.wertung.gluehwein,
    drumherum: z.wertung.drumherum,
    urteil: z.wertung.urteil,
    pruefstelle: pruef,
    saison: z.eintrag.saison,
    id: z.eintrag.id,
    von: stand ? (stand.von ?? stand.stempel) : pruef ? 'David & Philip' : anzeigeName(z.eintrag),
    stempel: stand?.stempel,
  };
}

const B = 1080;
const H = 1920;
const GOLD = '#ffe29a';
const GLUT = '#ff8a3d';
const WEIN = '#f0344f';

const RAHMEN: Record<number, [string, string, string]> = {
  1: ['#ffe29a', '#ff8a3d', '#f0344f'],
  2: ['#f4f7ff', '#9fb0e8', '#5d6fb8'],
  3: ['#ffd2ae', '#e08a45', '#9a4630'],
};
const URTEIL_FARBE: Record<string, [string, string]> = {
  Nachschenken: ['#3ecf8e', '#04170f'],
  'Richtig gut': ['rgba(62,207,142,.22)', '#8ff0c3'],
  'Geht klar': ['rgba(255,200,87,.22)', '#ffe29a'],
  'Einmal reicht': ['rgba(255,138,61,.25)', '#ffb98a'],
  Weggießen: ['#f0344f', '#ffffff'],
};

function rund(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

/** Bricht Text auf Zeilen um und verkleinert, bis er in `maxZeilen` passt. */
function passeText(c: CanvasRenderingContext2D, text: string, breite: number, start: number, min: number, maxZeilen: number, schrift: (px: number) => string) {
  for (let px = start; px >= min; px -= 4) {
    c.font = schrift(px);
    const zeilen: string[] = [];
    let akt = '';
    for (const wort of text.split(/\s+/)) {
      const probe = akt ? `${akt} ${wort}` : wort;
      if (c.measureText(probe).width <= breite || !akt) akt = probe;
      else {
        zeilen.push(akt);
        akt = wort;
      }
    }
    if (akt) zeilen.push(akt);
    if (zeilen.length <= maxZeilen && zeilen.every((z) => c.measureText(z).width <= breite)) return { zeilen, px };
  }
  c.font = schrift(min);
  return { zeilen: [text.slice(0, 22) + '…'], px: min };
}

async function ladeBild(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

export async function erzeugeKartenBild(d: KartenDaten): Promise<Blob> {
  await Promise.all([document.fonts.load('120px Anton'), document.fonts.load('40px "IBM Plex Mono"'), document.fonts.load('40px "IBM Plex Sans"')]);
  const siegel = await ladeBild('./logo.png');

  const cv = document.createElement('canvas');
  cv.width = B;
  cv.height = H;
  const c = cv.getContext('2d')!;

  // Nachthimmel
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
  glow(960, 120, 760, 'rgba(240,52,79,.30)');
  glow(60, 1860, 900, 'rgba(255,138,61,.26)');
  glow(540, 760, 820, 'rgba(40,56,140,.30)');

  // Lichterkette
  c.strokeStyle = 'rgba(255,255,255,.14)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, 36);
  c.quadraticCurveTo(140, 120, 270, 56);
  c.quadraticCurveTo(540, 84, 800, 52);
  c.quadraticCurveTo(950, 40, B, 46);
  c.stroke();
  const lichter: Array<[number, number, number, string]> = [
    [60, 70, 11, '#ffc857'], [190, 100, 8, '#ff8a3d'], [330, 62, 12, '#f0344f'], [470, 86, 8, '#ffe29a'], [610, 70, 11, '#ff8a3d'],
    [740, 74, 8, '#ffc857'], [860, 58, 12, '#f0344f'], [980, 56, 8, '#ffe29a'],
  ];
  for (const [x, y, r, f] of lichter) {
    c.save();
    c.shadowColor = f;
    c.shadowBlur = r * 4;
    c.fillStyle = f;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // Kopf: Siegel und Name
  c.textAlign = 'center';
  if (siegel) c.drawImage(siegel, B / 2 - 62, 70, 124, 124);
  c.fillStyle = '#f4f1ff';
  c.font = '72px Anton';
  c.fillText('GLÜHLABOR', B / 2, 270);
  c.fillStyle = '#a3accb';
  c.font = '26px "IBM Plex Mono"';
  c.letterSpacing = '6px';
  c.fillText('PRÜFSTELLE FÜR GLÜHWEIN', B / 2, 316);
  c.letterSpacing = '0px';

  // Karte auf eigener Fläche, damit die Kerben sauber ausgeschnitten werden können
  const kx = 80, ky = 360, kb = 920, kh = 1130, stummel = 236, r = 72;
  const karte = document.createElement('canvas');
  karte.width = kb;
  karte.height = kh;
  const k = karte.getContext('2d')!;
  const rahmenFarben = RAHMEN[d.rang ?? 0] ?? ['rgba(255,255,255,.35)', 'rgba(255,255,255,.12)', 'rgba(255,255,255,.2)'];

  const fl = k.createLinearGradient(0, 0, 0, kh);
  fl.addColorStop(0, 'rgba(26,34,82,.92)');
  fl.addColorStop(1, 'rgba(10,15,40,.92)');
  k.fillStyle = fl;
  rund(k, 0, 0, kb, kh, r);
  k.fill();
  const rg = k.createLinearGradient(0, 0, kb, kh);
  rg.addColorStop(0, rahmenFarben[0]);
  rg.addColorStop(0.5, rahmenFarben[1]);
  rg.addColorStop(1, rahmenFarben[2]);
  k.strokeStyle = rg;
  k.lineWidth = 6;
  rund(k, 3, 3, kb - 6, kh - 6, r - 3);
  k.stroke();

  const pad = 64;
  // Platz
  const lichtFarbe = (y0: number, y1: number) => {
    const lg = k.createLinearGradient(0, y0, 0, y1);
    lg.addColorStop(0, GOLD);
    lg.addColorStop(0.5, '#ffa05c');
    lg.addColorStop(1, WEIN);
    return lg;
  };
  k.textAlign = 'left';
  k.fillStyle = lichtFarbe(60, 170);
  k.font = '130px Anton';
  k.fillText(String(d.rang ?? '–').padStart(2, '0'), pad, 170);
  const rangBreite = k.measureText(String(d.rang ?? '–').padStart(2, '0')).width;
  k.fillStyle = '#a3accb';
  k.font = '30px "IBM Plex Mono"';
  k.letterSpacing = '6px';
  k.fillText('PLATZ', pad + rangBreite + 24, 170);
  k.letterSpacing = '0px';

  // Stempel
  k.save();
  k.translate(kb - pad - 130, 110);
  k.rotate(-0.05);
  const stempel = d.stempel ? d.stempel.toUpperCase() : d.pruefstelle ? 'PRÜFSTELLE' : 'COMMUNITY';
  k.font = '28px "IBM Plex Mono"';
  k.letterSpacing = '5px';
  const sw = k.measureText(stempel).width + 52;
  k.strokeStyle = d.pruefstelle ? 'rgba(255,200,87,.8)' : 'rgba(255,255,255,.3)';
  k.lineWidth = 3;
  rund(k, -sw / 2, -30, sw, 60, 14);
  k.stroke();
  k.fillStyle = d.pruefstelle ? GOLD : '#a3accb';
  k.textAlign = 'center';
  k.fillText(stempel, 0, 10);
  k.letterSpacing = '0px';
  k.restore();

  // Stand
  k.textAlign = 'left';
  k.fillStyle = '#f4f1ff';
  const t = passeText(k, d.stand.toUpperCase(), kb - pad * 2, 112, 60, 2, (px) => `${px}px Anton`);
  let y = 215 + t.px * 0.88;
  for (const z of t.zeilen) {
    k.font = `${t.px}px Anton`;
    k.fillText(z, pad, y);
    y += t.px * 1.04;
  }
  k.fillStyle = '#a3accb';
  k.font = '36px "IBM Plex Sans"';
  const ortT = passeText(k, d.ort, kb - pad * 2, 36, 26, 2, (px) => `${px}px "IBM Plex Sans"`);
  for (const z of ortT.zeilen) {
    k.font = `${ortT.px}px "IBM Plex Sans"`;
    k.fillText(z, pad, y + 6);
    y += ortT.px * 1.3;
  }

  // Gesamtnote
  const noteY = y + 300;
  k.save();
  k.shadowColor = 'rgba(255,138,61,.6)';
  k.shadowBlur = 70;
  k.fillStyle = lichtFarbe(noteY - 330, noteY);
  k.font = '300px Anton';
  k.fillText(zahl2(d.gesamt), pad - 8, noteY);
  k.restore();

  // Urteil
  if (d.urteil) {
    const [bg, fg] = URTEIL_FARBE[d.urteil] ?? ['rgba(255,255,255,.15)', '#fff'];
    k.font = '600 36px "IBM Plex Sans"';
    const uw = k.measureText(d.urteil).width + 60;
    k.fillStyle = bg;
    rund(k, pad, noteY + 34, uw, 66, 33);
    k.fill();
    k.fillStyle = fg;
    k.fillText(d.urteil, pad + 30, noteY + 80);
  }

  // Messbalken rechts neben der Note
  const balken = (label: string, wert: number | null, by: number) => {
    const bx = 590, bw = kb - pad - bx;
    k.fillStyle = '#a3accb';
    k.font = '26px "IBM Plex Mono"';
    k.letterSpacing = '4px';
    k.textAlign = 'left';
    k.fillText(label, bx, by);
    k.letterSpacing = '0px';
    k.textAlign = 'right';
    k.fillStyle = '#f4f1ff';
    k.font = '34px "IBM Plex Mono"';
    k.fillText(zahl2(wert), bx + bw, by);
    k.fillStyle = 'rgba(255,255,255,.12)';
    rund(k, bx, by + 18, bw, 16, 8);
    k.fill();
    const lg = k.createLinearGradient(bx, 0, bx + bw, 0);
    lg.addColorStop(0, '#ffc857');
    lg.addColorStop(0.6, GLUT);
    lg.addColorStop(1, WEIN);
    k.save();
    k.shadowColor = 'rgba(255,138,61,.7)';
    k.shadowBlur = 18;
    k.fillStyle = lg;
    rund(k, bx, by + 18, Math.max(16, (bw * (wert ?? 0)) / 10), 16, 8);
    k.fill();
    k.restore();
  };
  balken('GLÜHWEIN', d.gluehwein, noteY - 200);
  balken('DRUMHERUM', d.drumherum, noteY - 100);

  // Abrisslinie und Stummel
  const py = kh - stummel;
  k.strokeStyle = 'rgba(255,255,255,.22)';
  k.lineWidth = 4;
  k.setLineDash([16, 12]);
  k.beginPath();
  k.moveTo(40, py);
  k.lineTo(kb - 40, py);
  k.stroke();
  k.setLineDash([]);
  // Strichcode
  let h = 2166136261;
  let bx = pad;
  k.fillStyle = 'rgba(244,241,255,.85)';
  for (let i = 0; i < 38; i++) {
    h = Math.imul(h ^ (d.id.charCodeAt(i % d.id.length) + i), 16777619);
    const w = 3 + ((h >>> 0) % 3) * 2.4;
    k.fillRect(bx, py + 60, w, 86);
    bx += w + 4.4;
  }
  k.textAlign = 'left';
  k.fillStyle = '#a3accb';
  k.font = '26px "IBM Plex Mono"';
  k.letterSpacing = '4px';
  k.fillText(`${d.saison} · #${kurzId(d.id)}`, bx + 36, py + 100);
  k.letterSpacing = '0px';
  k.font = '30px "IBM Plex Sans"';
  k.fillText(`von ${d.von}`, bx + 36, py + 146);

  // Kerben
  k.globalCompositeOperation = 'destination-out';
  for (const x of [0, kb]) {
    k.beginPath();
    k.arc(x, py, 30, 0, Math.PI * 2);
    k.fill();
  }
  k.globalCompositeOperation = 'source-over';

  c.save();
  c.shadowColor = d.rang === 1 ? 'rgba(255,138,61,.55)' : 'rgba(150,170,255,.3)';
  c.shadowBlur = 90;
  c.drawImage(karte, kx, ky);
  c.restore();

  // Aufruf unter der Karte
  c.textAlign = 'center';
  c.fillStyle = '#f4f1ff';
  const aufruf = passeText(c, 'WIE SCHMECKT DEIN GLÜHWEIN?', 940, 96, 56, 1, (px) => `${px}px Anton`);
  c.font = `${aufruf.px}px Anton`;
  c.fillText(aufruf.zeilen[0], B / 2, 1610);
  c.font = '46px "IBM Plex Mono"';
  const lg = c.createLinearGradient(300, 0, 780, 0);
  lg.addColorStop(0, '#ffc857');
  lg.addColorStop(1, '#ff8a3d');
  c.fillStyle = lg;
  c.fillText('gluehlabor.de', B / 2, 1695);
  c.fillStyle = '#a3accb';
  c.font = '28px "IBM Plex Sans"';
  c.fillText('Gemacht von David (Bayern) & Philip (Hamburg)', B / 2, 1790);

  return new Promise((ok, fehler) => cv.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht erzeugt werden'))), 'image/png'));
}

/** Teilt das Bild mit dem Share-Dialog des Telefons; wo das nicht geht (Rechner), wird es heruntergeladen. */
export async function teileKartenBild(d: KartenDaten, link: string): Promise<'geteilt' | 'gespeichert' | 'abgebrochen'> {
  try {
    const blob = await erzeugeKartenBild(d);
    const name = `gluehlabor-${d.stand.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '') || 'becher'}.png`;
    const datei = new File([blob], name, { type: 'image/png' });
    const text = `${d.stand}: ${zahl2(d.gesamt)} von 10 bei Glühlabor`;
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], title: 'Glühlabor', text: `${text} ${link}` });
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
