// Eine Wertung als Sterne: Zahl auf eine Stelle (von 5) mit kleinem Stern. Der 10-Punkte-Wert bleibt intern.
import { sterneText } from '../../lib/format';

export function Stern({ groesse = 14 }: { groesse?: number }) {
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" aria-hidden="true" class="inline-block shrink-0 align-baseline">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" />
    </svg>
  );
}

export function SterneWert({ wert, stern = 0.5 }: { wert: number | null | undefined; stern?: number }) {
  return (
    <span class="whitespace-nowrap" aria-label={wert === null || wert === undefined ? undefined : `${sterneText(wert)} von 5`}>
      {sterneText(wert)}
      {wert !== null && wert !== undefined && (
        <span class="ml-[0.12em] inline-block" style={{ fontSize: `${stern}em` }} aria-hidden="true">
          <Stern groesse={14} />
        </span>
      )}
    </span>
  );
}
