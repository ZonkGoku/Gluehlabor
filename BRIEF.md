# Becherwerk — Auftrag

Dies ist der ursprüngliche Auftrag, unverändert abgelegt.

> **Stand 18.11.2026: Die Ausrichtung hat sich geändert.** Aus dem Projekt für zwei Nutzer wird ein
> Community-Produkt: viele Leute bewerten, ohne Registrierung, mit freiwilligem Namen, Becher werden per
> QR-Code geteilt. Damit sind folgende Teile dieses Auftrags überholt: „NICHT BAUEN" (Konten für Fremde,
> Social-Features), „TECHNIK" (Sync über GitHub, Schreiben nur mit Token) und der Stack-Vorschlag am
> Ende. Maßgeblich ist jetzt `CLAUDE.md`. Alles andere (Scoring, Gestaltung, Statistik, Ankerdefinitionen)
> gilt unverändert.


════════════════════════════════════════════════════════════════════

## VORGEHEN — bitte genau in dieser Reihenfolge

1. Diesen Auftrag lesen.
2. Einen Stack vorschlagen und in höchstens fünf Sätzen begründen.
   Geh dabei besonders darauf ein, wie du Offline-Erfassung und die
   Synchronisation zwischen zwei Nutzern löst, ohne ein
   überdimensioniertes Backend zu bauen. Nenn, was es kostet und was
   es an Wartung bedeutet. DANN STOPP und warte auf meine Bestätigung.
3. Die Scoring-Funktion plus Tests implementieren, bevor eine einzige
   UI-Komponente entsteht. Tests müssen grün sein.
4. Den Erfassungsscreen bauen. DANN STOPP und zeig ihn mir.
   Funktioniert der nicht, ist alles andere egal.
5. Erst danach die übrigen Ansichten.

Arbeite in kleinen Commits mit sprechenden Messages. Lege eine CLAUDE.md
an, die Stack, Verzeichnisstruktur und die Scoring-Regeln festhält,
damit spätere Sitzungen nicht neu raten müssen. Lege diesen Auftrag als
BRIEF.md im Repo ab.

════════════════════════════════════════════════════════════════════

## WAS DAS IST

Zwei Freunde bewerten seit 2025 systematisch Glühwein auf Hamburger
Weihnachtsmärkten. Ein Becherwerk ist eine Maschine aus der
Fördertechnik, die Becher nach oben befördert — genau das macht die App
mit Glühwein.

Bisher lief das in einem Google Sheet. Dieses Sheet hatte einen
Rechenfehler, der eine ganze Saison lang unentdeckt blieb: ein
überzähliges Semikolon in AVERAGE(...;) erzeugte ein leeres achtes
Argument, das als Null zählte. Alle Noten waren dadurch um ein Achtel
zu niedrig, und das Ranking stimmte an zwei Stellen nicht.

Daraus folgt die wichtigste Auflage dieses Projekts: Die
Bewertungslogik ist eine reine, vollständig getestete Funktion ohne
UI-Abhängigkeiten. Sie liegt in einer eigenen Datei. Keine Rechenlogik
in React-Komponenten.

## NUTZUNGSSITUATION

Zwei Nutzer, eine gemeinsame Bewertung pro Becher. Erfasst wird
draußen: im Stehen, bei Minusgraden, einhändig, der Becher in der
anderen Hand, auf einem Weihnachtsmarkt ohne brauchbares Netz.
Angesehen und hergezeigt wird später am Rechner. Die Ergebnisse sollen
öffentlich lesbar sein, das Eintragen nicht.

## DATENMODELL

Ein Eintrag ist ein getrunkener Becher, nicht ein Stand. Derselbe
Stand an einem anderen Abend ist ein neuer Eintrag, keine Korrektur.

    id            uuid
    stand         string, Pflicht
    markt         string, Auswahl aus gepflegter Liste, Freitext erlaubt
    saison        number, Pflicht, Default aktuelles Jahr
    datum         date, optional
    sorte         "rot" | "weiss" | "kirsch" | "winzer" |
                  "feuerzangen" | "alkoholfrei" | "sonstiges", optional
    becherNr      1..7, optional — der wievielte Glühwein des Abends
    preis         number (Euro), optional
    notiz         string, optional
    foto          blob/url, optional
    noten         { geschmack, geruch, temperatur, personal,
                    atmosphaere, preisLeistung, becher }
                  jeweils 1..10 ganzzahlig ODER null
    erstelltAm    timestamp

Gewichte sind globaler Anwendungszustand, kein Teil des Eintrags:

    geschmack 3 · geruch 2 · temperatur 2 · preisLeistung 2
    personal 1 · atmosphaere 1 · becher 1

Sie müssen in der Oberfläche veränderbar sein, und jede Änderung
rechnet alle Ansichten sofort neu.

Gepflegte Marktliste: Rathausmarkt, Ottensen, Santa Pauli, Gänsemarkt,
Fleetinsel, Jungfernstieg, Winterwald, Spitalerstraße, HafenCity,
St. Georg, Eppendorf, Osterstraße, Blankenese, Bergedorf, Ikea Altona,
Sonstiger.

## SCORING — der Kern

    gesamt    = Σ(note × gewicht) / Σ(gewicht)  über alle NICHT-NULL Noten
    gluehwein = dieselbe Formel über geschmack, geruch, temperatur
    drumherum = dieselbe Formel über personal, atmosphaere,
                preisLeistung, becher

Eine fehlende Note fällt aus Zähler UND Nenner. Sie zählt niemals als
Null. Das ist exakt der Fehler aus dem Sheet.

Urteil, abgeleitet aus gesamt:

    >= 8,0   Nachschenken
    >= 6,0   Richtig gut
    >= 5,0   Geht klar
    >= 4,0   Einmal reicht
    sonst    Weggießen

Rangfolge absteigend nach gesamt, mit geteilten Plätzen bei
Gleichstand: 1, 1, 3 — nicht 1, 2, 3.

### Testfälle, die grün sein müssen

Noten in der Reihenfolge geschmack, geruch, temperatur, personal,
atmosphaere, preisLeistung, becher. Default-Gewichte, zwei
Nachkommastellen.

    6,6,8,7,5,5,8          -> gesamt 6.33  glühwein 6.57  drumherum 6.00
    6,7,9,5,6,6,3          -> gesamt 6.33  glühwein 7.14  drumherum 5.20
    6,5,8,4,8,6,7          -> gesamt 6.25  glühwein 6.29  drumherum 6.20
    4,4,2,5,4,3,5          -> gesamt 3.67  glühwein 3.43  drumherum 4.00
    10,10,10,10,10,10,10   -> gesamt 10.00
    1,1,1,1,1,1,1          -> gesamt 1.00

Lückentest: 6,6,8,7,5,5,null ergibt 6.18.
Ergibt dein Code 5.67, setzt er die fehlende Note als Null ein und ist
falsch.

Rangtest: Zwei Einträge mit 6.33 und einer mit 6.25 ergeben die Plätze
1, 1, 3.

## DER ERFASSUNGSSCREEN IST DIE APP

Das ist der Screen, der über Erfolg oder Scheitern entscheidet.

- Eine Ansicht, sieben Eingaben, ohne Scrollen bedienbar
- Schieberegler oder Tap-Skala statt Zahlenfeld. Große Trefferflächen
  im Daumenbereich, mit Handschuhen bedienbar
- Tastatur nur für Stand und Notiz. Markt, Sorte und Becher-Nr. sind
  Auswahl
- Neben jedem Kriterium ein antippbarer Hinweis mit der
  Ankerdefinition. Eine Zeile, kein Dialog, der den Screen verlässt
- Zielzeit: eine vollständige Bewertung in unter 30 Sekunden
- OFFLINE ZWINGEND. Auf Weihnachtsmärkten ist das Netz tot. Erfassen
  muss ohne Verbindung funktionieren, Synchronisation passiert später
  von selbst. Ein Eintrag darf nie verloren gehen, weil kein Netz da war
- Als PWA installierbar, mit Icon auf dem Homescreen

## ANKERDEFINITIONEN

Als Daten anlegen, nicht fest im Code. Sie werden sich ändern.

GESCHMACK
 10 Der beste Glühwein, den ich je hatte. Würde sofort nochmal bestellen.
  8 Deutlich über Durchschnitt. Gewürze schmeckbar, Wein nicht nur Zucker.
  6 Solide. Trinkt man gern aus, denkt aber nicht drüber nach.
  4 Zu süß, zu dünn oder künstlich. Man trinkt ihn, weil er warm ist.
  2 Man lässt den Rest stehen.

GERUCH
 10 Man riecht ihn drei Meter vor dem Stand und will sofort einen.
  8 Klare Gewürznote. Zimt und Orange statt Alkoholfahne.
  6 Riecht nach Glühwein, mehr nicht.
  4 Riecht nach heißem Saft oder nach gar nichts.
  2 Riecht abschreckend. Billigwein oder Spülwasser.

TEMPERATUR
 10 Heiß genug, dass man kurz wartet, nie heiß genug zum Verbrennen.
    Bleibt bis zum letzten Schluck warm.
  8 Gut heiß, kühlt gegen Ende leicht ab.
  6 Trinkbar warm, nach fünf Minuten lauwarm.
  4 Zu heiß zum Trinken oder von Anfang an zu kalt.
  2 Verbrannte Zunge oder kalter Becher.

PERSONAL
 10 Schnell, freundlich, hat Lust auf den Job. Man kommt wegen der
    Leute wieder.
  8 Zugewandt und zügig.
  6 Macht seinen Job. Kein Kontakt, keine Beschwerde.
  4 Lustlos oder langsam. Man fühlt sich wie eine Störung.
  2 Unfreundlich, oder es wird falsch kassiert.

ATMOSPHÄRE (gemeint ist der Stand, nicht der Markt)
 10 Man will bleiben. Licht, Enge, Musik — alles stimmt.
  8 Angenehm. Man stellt sich gern dazu.
  6 Funktional. Man trinkt und geht.
  4 Zugig, grell, zu laut oder zu voll.
  2 Man flüchtet mit dem Becher.

PREIS / LEISTUNG
 10 Für das Geld unschlagbar.
  8 Fair. Man zahlt gern.
  6 Üblicher Preis für übliche Qualität.
  4 Zu teuer für das, was drin ist.
  2 Abzocke.

BECHER
 10 Sammelbecher, den man behalten will. Form, Motiv und Haptik stimmen.
  8 Ordentliche Keramik mit eigenem Motiv.
  6 Standardbecher ohne Eigenart.
  4 Dünn, hässlich oder unangenehm zu halten.
  2 Pappe oder Plastik.

## WEITERE ANSICHTEN

- Rangliste als Startansicht: Rang, Stand, Gesamtnote, beide Teilnoten,
  Urteil. Filter nach Saison und Markt
- Detailansicht eines Eintrags mit allen sieben Noten als Profil
- Jahresvergleich: Stände, die in mehreren Saisons bewertet wurden,
  mit Differenz und Richtung
- Checkliste: welche Märkte der gepflegten Liste noch keine Bewertung
  haben
- Statistik (siehe unten)
- Öffentliche Ergebnisseite: nur lesend, ohne Login, teilbar

## STATISTIK — der eigentliche Clou

Die App prüft, ob die beiden noch brauchbar bewerten, und sagt es
ihnen im Klartext:

- Je Kriterium: Spannweite, Mittelwert, Streuung, genutzte Stufen
- Korrelation jedes Kriteriums mit dem Geschmack. Über 0,6 heißt:
  misst nichts Eigenes
- Spannweite unter 5 Stufen heißt: die Skala wird zu eng benutzt
- Notenverlauf über die Becher-Nr. eines Abends. Steigen die Noten mit
  jedem weiteren Glühwein, wird der Pegel bewertet und nicht der Wein

Formuliere die Hinweise als Sätze, nicht als Zahlentabelle:
„Beim Geschmack hast du nur 3 bis 7 vergeben. Die Skala hat zehn Stufen."

Diese Befunde aus Saison 2025 muss der Import reproduzieren — nimm sie
als Prüfung, ob deine Statistik richtig rechnet:
- Geschmack nutzt nur die Stufen 3 bis 7
- Die 10 ist in 98 Einzelnoten kein einziges Mal gefallen
- Preis/Leistung korreliert zu 0,71 mit Geschmack
- Personal und Atmosphäre korrelieren zu −0,61

## TECHNIK

Freie Wahl, solange diese Punkte sitzen:

- Offline-first. Lokaler Speicher ist die Wahrheit, Sync läuft im
  Hintergrund
- Zwei Nutzer sehen denselben Datenbestand
- Lesen ohne Login möglich, Schreiben nicht
- Auf einem drei Jahre alten Android flüssig
- Kein Build-Monster. Zwei Nutzer, ein paar hundert Einträge

Deployment über GitHub Pages aus diesem Repo, per Actions-Workflow
beim Push auf main. Wenn dein Bundler einen base-Pfad braucht, denk an
die Pages-Unterverzeichnis-Konfiguration — das ist der klassische
Stolperstein, bei dem die Seite weiß bleibt und keine Fehlermeldung
kommt. Wenn dein Vorschlag ein Backend braucht, nenn es im
Stack-Vorschlag und begründe, warum eine rein statische Lösung nicht
reicht.

## GESTALTUNG

    --accent     #7B1E2B   Bordeaux
    --gold       #D9A640
    --bg-hell    #FBF7F6
    --bg-dunkel  #17100F

Helles und dunkles Theme, beide ausgearbeitet, keins als Abfallprodukt
des anderen. Zahlen in einer Monospace, damit Spalten fluchten.

Die Anmutung ist Prüfbericht, nicht Weihnachtsmarkt: nüchterne
Typografie, klare Tabellen, Messwert-Charakter. Kein Schnee, keine
Tannenzweige, keine Emoji als Gliederung. Der Kontrast zwischen
trockener Methodik und dem albernen Gegenstand ist der Witz des
Projekts. Das Design trägt ihn, statt ihn zu brechen.

## BESTANDSDATEN

Lege diese 14 Zeilen als data/gluehwein-2025.csv im Repo ab. Die App
startet mit diesen Daten, nicht leer. Baue einen Importpfad, der die
Datei liest — schreib die Werte nicht in den Quelltext.

    stand,markt,saison,geschmack,geruch,temperatur,personal,atmosphaere,preis_leistung,becher
    Salz Chrom,Sonstiger,2025,6,6,8,7,5,5,8
    Rathaus Schloss,Rathausmarkt,2025,6,5,8,4,8,6,7
    Ikea Altona,Ikea Altona,2025,6,7,9,5,6,6,3
    Otten Schleenwurm,Ottensen,2025,7,6,5,6,7,7,4
    Winterwald,Jungfernstieg,2025,6,6,8,6,7,4,5
    Salz Oma,Sonstiger,2025,6,6,7,8,3,7,1
    Salz Kameraden,Sonstiger,2025,6,4,8,8,5,6,1
    Salz Kroate,Sonstiger,2025,5,4,5,7,4,6,1
    Salz Pfadfinder,Sonstiger,2025,3,6,7,8,2,4,1
    Santa Pauli,Santa Pauli,2025,5,5,5,4,6,5,5
    Otten Tallinn,Ottensen,2025,5,4,5,5,4,5,4
    Gaensemarkt,Gänsemarkt,2025,4,4,4,5,5,5,4
    Salz Stern,Sonstiger,2025,3,3,6,4,6,4,4
    Trauen Max,Sonstiger,2025,4,4,2,5,4,3,5

Nach dem Import muss die Rangliste so aussehen: Salz Chrom und Ikea
Altona teilen sich mit 6.33 Platz 1, Rathaus Schloss folgt mit 6.25
auf Platz 3, Schlusslicht ist Trauen Max mit 3.67 und dem Urteil
„Weggießen". Stimmt das nicht, ist das Scoring oder das Ranking kaputt.

## NICHT BAUEN

Keine Nutzerkonten für Fremde, keine Kommentarfunktion, keine
Social-Features, keine Push-Benachrichtigungen, kein
Teilen-auf-Social, keine Gamification mit Abzeichen. Eine öffentlich
lesbare Ergebnisseite reicht.

════════════════════════════════════════════════════════════════════

## Vereinbarter Stack (Schritt 2, bestätigt)

Vite + Preact + TypeScript, vite-plugin-pwa, IndexedDB via Dexie,
Sync über die GitHub-Contents-API (eine Datei pro Eintrag unter
`data/eintraege/`), Lesen öffentlich über GitHub Pages, Schreiben mit
fine-grained Token. Kein eigenes Backend.
