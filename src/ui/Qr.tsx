import qrcode from 'qrcode-generator';
import { useMemo } from 'preact/hooks';

/**
 * QR-Code als SVG. Immer schwarz auf weiß mit Ruhezone, auch im dunklen Theme:
 * Handykameras erkennen invertierte Codes nicht zuverlässig.
 */
export function Qr({ text, titel }: { text: string; titel: string }) {
  const { pfad, n } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { pfad: d, n };
  }, [text]);
  const rand = 4;
  return (
    <svg
      class="qr"
      viewBox={`${-rand} ${-rand} ${n + 2 * rand} ${n + 2 * rand}`}
      shape-rendering="crispEdges"
      role="img"
      aria-label={titel}
    >
      <rect x={-rand} y={-rand} width={n + 2 * rand} height={n + 2 * rand} fill="#ffffff" />
      <path d={pfad} fill="#000000" />
    </svg>
  );
}
