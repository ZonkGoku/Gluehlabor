-- Zähler bekommen ein Ablaufdatum, damit ein Aufräumlauf sie löschen kann.
ALTER TABLE limits ADD COLUMN ablauf INTEGER NOT NULL DEFAULT 0;

-- Meldungen von Nutzern (Meldeverfahren). Pro Gerät und Becher höchstens eine.
CREATE TABLE meldungen (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  becher_id   TEXT NOT NULL,
  geraet_id   TEXT NOT NULL,
  grund       TEXT NOT NULL,
  text        TEXT,
  erstellt_am INTEGER NOT NULL,
  bearbeitet  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (becher_id, geraet_id)
);
CREATE INDEX meldungen_offen ON meldungen(bearbeitet, becher_id);
