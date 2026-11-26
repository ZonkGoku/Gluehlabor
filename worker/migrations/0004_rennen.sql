-- Schlittenrennen (Beta): von Spielern angelegte Rennen und ihre Teilnehmer. Die Schritte zählt die App aus den öffentlichen Bewertungen.
CREATE TABLE rennen (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  ziel        INTEGER NOT NULL,
  ersteller   TEXT NOT NULL,
  erstellt_am INTEGER NOT NULL,
  ende        INTEGER NOT NULL
);
CREATE TABLE rennen_teilnehmer (
  rennen_id TEXT NOT NULL,
  geraet_id TEXT NOT NULL,
  kamel     TEXT NOT NULL,
  farbe     INTEGER NOT NULL,
  seit      INTEGER NOT NULL,
  PRIMARY KEY (rennen_id, geraet_id)
);
