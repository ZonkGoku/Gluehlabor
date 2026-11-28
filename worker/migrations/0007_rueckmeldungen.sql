-- Rückmeldungen („Was fehlt dir?“) aus der App: freier Text, anonym (nur die Geräte-Kennung für das Tageslimit), von der Prüfstelle lesbar.
CREATE TABLE rueckmeldungen (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  geraet_id   TEXT NOT NULL,
  text        TEXT NOT NULL,
  seite       TEXT,
  erstellt_am INTEGER NOT NULL,
  bearbeitet  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX rueckmeldungen_offen ON rueckmeldungen(bearbeitet, erstellt_am);
