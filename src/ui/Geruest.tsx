// App-Gerüst: Kopf + Tab-Leiste am Telefon, Seitenleiste am Rechner.
import type { ComponentChildren } from 'preact';
import { useDarfErfassen } from './daten';
import { Symbol } from './Symbol';
import { SyncAnzeige } from './SyncAnzeige';

const NAV = [
  { route: '', label: 'Übersicht', symbol: 'uebersicht' },
  { route: 'rangliste', label: 'Rangliste', symbol: 'rangliste' },
  { route: 'vergleich', label: 'Vergleich', symbol: 'vergleich' },
  { route: 'statistik', label: 'Statistik', symbol: 'statistik' },
  { route: 'spickzettel', label: 'Spickzettel', symbol: 'spickzettel' },
];

export function Geruest({ route, children }: { route: string; children: ComponentChildren }) {
  const darf = useDarfErfassen();
  const aktiv = (r: string) => (route === r || (r === 'rangliste' && route.startsWith('becher/')) ? 'page' : undefined);
  return (
    <div class="app">
      <aside class="seitenleiste">
        <img class="logo" src="./logo.svg" alt="Becherwerk – gemacht und betrieben von David & Philip" />
        <div class="titel">
          Becherwerk
          <small>Prüfstelle für Glühwein</small>
        </div>
        {NAV.map((n) => (
          <a class="navpunkt" href={`#/${n.route}`} aria-current={aktiv(n.route)}>
            <Symbol name={n.symbol} groesse={20} />
            {n.label}
          </a>
        ))}
        <a class="navpunkt" href="#/einstellungen" aria-current={aktiv('einstellungen')}>
          <Symbol name="einstellungen" groesse={20} />
          Einstellungen
        </a>
        {darf && (
          <a class="navpunkt erfassen" href="#/erfassen">
            <Symbol name="plus" groesse={20} />
            Becher erfassen
          </a>
        )}
        <div class="fussnote">
          {darf && <SyncAnzeige />}
          <div>Gemacht und betrieben von David (Bayern) &amp; Philip (Hamburg). Bewertet wird in ganz Deutschland.</div>
        </div>
      </aside>

      <header class="app-kopf">
        <img class="zeichen" src="./icon.svg" alt="" />
        <div class="name">
          Becherwerk
          <small>Bayern × Hamburg</small>
        </div>
        {darf && <SyncAnzeige />}
        <a class="symbolknopf" href="#/spickzettel" aria-label="Spickzettel">
          <Symbol name="spickzettel" />
        </a>
        <a class="symbolknopf" href="#/einstellungen" aria-label="Einstellungen">
          <Symbol name="einstellungen" />
        </a>
      </header>

      <main class="inhalt">{children}</main>

      <nav class="tabs" aria-label="Ansichten">
        <a class="tab" href="#/" aria-current={aktiv('')}>
          <Symbol name="uebersicht" />
          Übersicht
        </a>
        <a class="tab" href="#/rangliste" aria-current={aktiv('rangliste')}>
          <Symbol name="rangliste" />
          Rangliste
        </a>
        {darf ? (
          <a class="tab-plus" href="#/erfassen" aria-label="Becher erfassen">
            <Symbol name="plus" groesse={28} />
          </a>
        ) : (
          <a class="tab" href="#/spickzettel" aria-current={aktiv('spickzettel')}>
            <Symbol name="spickzettel" />
            Regeln
          </a>
        )}
        <a class="tab" href="#/vergleich" aria-current={aktiv('vergleich')}>
          <Symbol name="vergleich" />
          Vergleich
        </a>
        <a class="tab" href="#/statistik" aria-current={aktiv('statistik')}>
          <Symbol name="statistik" />
          Statistik
        </a>
      </nav>
    </div>
  );
}
