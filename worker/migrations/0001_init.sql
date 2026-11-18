-- Glühlabor Community-Server. SQLite (Cloudflare D1 oder eigener Server).

CREATE TABLE geraete (
  id             TEXT PRIMARY KEY,          -- anonyme Kennung, vom Gerät gewählt (UUID)
  schluessel_hash TEXT NOT NULL,            -- SHA-256 des Geräteschlüssels; der Schlüssel selbst liegt nur auf dem Gerät
  name           TEXT,                      -- freiwilliger Anzeigename
  pruefstelle    INTEGER NOT NULL DEFAULT 0,
  gesperrt       INTEGER NOT NULL DEFAULT 0,
  erstellt_am    INTEGER NOT NULL
);

CREATE TABLE becher (
  seq            INTEGER NOT NULL,          -- Sync-Zähler; steigt bei jeder Änderung, auch beim Ausblenden
  id             TEXT PRIMARY KEY,
  geraet_id      TEXT NOT NULL REFERENCES geraete(id),
  name           TEXT,                      -- Name zum Zeitpunkt des Bewertens
  pruefstelle    INTEGER NOT NULL DEFAULT 0,
  besuch_id      TEXT,
  stand          TEXT NOT NULL,
  markt          TEXT NOT NULL,
  stadt          TEXT,
  saison         INTEGER NOT NULL,
  datum          TEXT,
  sorte          TEXT,
  becher_nr      INTEGER,
  preis          REAL,
  notiz          TEXT,
  geschmack      INTEGER,
  geruch         INTEGER,
  temperatur     INTEGER,
  personal       INTEGER,
  atmosphaere    INTEGER,
  preis_leistung INTEGER,
  becher         INTEGER,
  erstellt_am    INTEGER NOT NULL,          -- Zeitpunkt auf dem Gerät
  eingegangen_am INTEGER NOT NULL,          -- Zeitpunkt auf dem Server
  versteckt      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX becher_seq ON becher(seq);
CREATE INDEX becher_geraet ON becher(geraet_id, eingegangen_am);
CREATE INDEX becher_besuch ON becher(besuch_id);

-- Einfache Zähler für Begrenzungen (Geräte je IP und Stunde u. ä.)
CREATE TABLE limits (
  schluessel TEXT PRIMARY KEY,
  fenster    INTEGER NOT NULL,
  anzahl     INTEGER NOT NULL
);
