-- Fahrzeug im Schlittenfahren (0 Schlitten, 1 Rennwagen, 2 Rentier, 3 Becher). Ältere Teilnehmer fahren Schlitten.
ALTER TABLE rennen_teilnehmer ADD COLUMN fahrzeug INTEGER NOT NULL DEFAULT 0;
