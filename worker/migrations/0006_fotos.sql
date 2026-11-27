-- Fotos der Bewertungen, die der Bewertende für alle sichtbar macht (mit Einwilligung). JPEG als Base64-Text: groß (höchstens ca. 1000 px) und klein (Vorschau).
CREATE TABLE fotos (
  becher_id   TEXT PRIMARY KEY,
  geraet_id   TEXT NOT NULL,
  groesse     INTEGER NOT NULL,
  gross       TEXT NOT NULL,
  klein       TEXT NOT NULL,
  erstellt_am INTEGER NOT NULL,
  versteckt   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX fotos_geraet ON fotos(geraet_id);
