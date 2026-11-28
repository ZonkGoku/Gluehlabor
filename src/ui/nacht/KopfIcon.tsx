// Kleines Symbol vor einer Überschrift oder einem Panel-Titel: zeigt auf einen Blick, wo man ist.
import { Symbol } from '../Symbol';

export function KopfIcon({ name, groesse = 16 }: { name: string; groesse?: number }) {
  return (
    <span class="kopf-icon" aria-hidden="true">
      <Symbol name={name} groesse={groesse} />
    </span>
  );
}
