<?php
// Datenbank für das Webhosting: SQLite-Datei oder MySQL/MariaDB, je nach config.php.
// Das Schema entspricht worker/migrations/*.sql.
declare(strict_types=1);

final class Db
{
    public PDO $pdo;
    public string $typ;

    /** @param array<string,mixed> $cfg */
    public function __construct(array $cfg)
    {
        $this->typ = $cfg['typ'] ?? 'sqlite';
        if ($this->typ === 'mysql') {
            $dsn = 'mysql:host=' . $cfg['host'] . ';dbname=' . $cfg['name'] . ';charset=utf8mb4';
            $this->pdo = new PDO($dsn, $cfg['benutzer'], $cfg['passwort'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
                PDO::MYSQL_ATTR_FOUND_ROWS => true,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->pdo->exec("SET time_zone = '+00:00'");
        } else {
            $this->pdo = new PDO('sqlite:' . $cfg['datei'], null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->pdo->exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
            $this->pdo->exec('PRAGMA journal_mode = WAL;');
        }
        $this->schema();
    }

    /** @param list<mixed> $p */
    private function binde(PDOStatement $s, array $p): void
    {
        foreach ($p as $i => $w) {
            $s->bindValue($i + 1, $w, match (true) {
                $w === null => PDO::PARAM_NULL,
                is_int($w), is_bool($w) => PDO::PARAM_INT,
                default => PDO::PARAM_STR,
            });
        }
    }

    /** @param list<mixed> $p */
    public function lauf(string $sql, array $p = []): int
    {
        $s = $this->pdo->prepare($sql);
        $this->binde($s, $p);
        $s->execute();
        return $s->rowCount();
    }

    /** @param list<mixed> $p @return array<string,mixed>|null */
    public function eins(string $sql, array $p = []): ?array
    {
        $s = $this->pdo->prepare($sql);
        $this->binde($s, $p);
        $s->execute();
        $z = $s->fetch();
        return $z === false ? null : $z;
    }

    /** @param list<mixed> $p @return list<array<string,mixed>> */
    public function alle(string $sql, array $p = []): array
    {
        $s = $this->pdo->prepare($sql);
        $this->binde($s, $p);
        $s->execute();
        return $s->fetchAll();
    }

    public function ignoriere(): string
    {
        return $this->typ === 'mysql' ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
    }

    /** Alles oder nichts. Bei SQLite sofort mit Schreibsperre, damit Schreiber sich nacheinander einreihen. */
    public function transaktion(callable $f): mixed
    {
        $this->pdo->exec($this->typ === 'mysql' ? 'START TRANSACTION' : 'BEGIN IMMEDIATE');
        try {
            $r = $f();
            $this->pdo->exec('COMMIT');
            return $r;
        } catch (Throwable $t) {
            $this->pdo->exec('ROLLBACK');
            throw $t;
        }
    }

    /**
     * Nächste Sync-Nummer. Nur innerhalb von transaktion() aufrufen: die Zeile des Zählers bleibt bis zum
     * Commit gesperrt, damit Nummern in der Reihenfolge sichtbar werden, in der sie vergeben wurden.
     */
    public function naechsteSeq(): int
    {
        $this->lauf("UPDATE zaehler SET wert = wert + 1 WHERE name = 'seq'");
        return (int) $this->eins("SELECT wert FROM zaehler WHERE name = 'seq'")['wert'];
    }

    /** Bringt eine ältere Datenbank auf den heutigen Stand (neue Spalten). Läuft bei jedem Start, ist aber nach dem ersten Mal wirkungslos. */
    private function aktualisiere(): void
    {
        $kommazahl = $this->typ === 'mysql' ? 'DOUBLE' : 'REAL';
        $hatMenge = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'becher' AND column_name = 'menge'")
            : $this->eins("SELECT 1 AS x FROM pragma_table_info('becher') WHERE name = 'menge'");
        if (!$hatMenge) {
            $this->pdo->exec("ALTER TABLE becher ADD COLUMN menge $kommazahl");
        }
        $hatRennen = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rennen'")
            : $this->eins("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'rennen'");
        if (!$hatRennen) {
            foreach ($this->rennenSchema() as $q) {
                $this->pdo->exec($q);
            }
        }
        $hatFotos = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'fotos'")
            : $this->eins("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'fotos'");
        if (!$hatFotos) {
            foreach ($this->fotosSchema() as $q) {
                $this->pdo->exec($q);
            }
        }
        $hatRueck = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rueckmeldungen'")
            : $this->eins("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'rueckmeldungen'");
        if (!$hatRueck) {
            foreach ($this->rueckSchema() as $q) {
                $this->pdo->exec($q);
            }
        }
        $hatStimmung = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rueckmeldungen' AND column_name = 'stimmung'")
            : $this->eins("SELECT 1 AS x FROM pragma_table_info('rueckmeldungen') WHERE name = 'stimmung'");
        if (!$hatStimmung && $hatRueck) {
            $this->pdo->exec('ALTER TABLE rueckmeldungen ADD COLUMN stimmung INTEGER');
        }
        $hatTags = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'becher' AND column_name = 'tags'")
            : $this->eins("SELECT 1 AS x FROM pragma_table_info('becher') WHERE name = 'tags'");
        if (!$hatTags) {
            $this->pdo->exec('ALTER TABLE becher ADD COLUMN tags ' . ($this->typ === 'mysql' ? 'VARCHAR(255)' : 'TEXT'));
        }
        $hatFahrzeug = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rennen_teilnehmer' AND column_name = 'fahrzeug'")
            : $this->eins("SELECT 1 AS x FROM pragma_table_info('rennen_teilnehmer') WHERE name = 'fahrzeug'");
        if (!$hatFahrzeug) {
            $this->pdo->exec('ALTER TABLE rennen_teilnehmer ADD COLUMN fahrzeug INTEGER NOT NULL DEFAULT 0');
        }
        $hatAvatar = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rennen_teilnehmer' AND column_name = 'avatar'")
            : $this->eins("SELECT 1 AS x FROM pragma_table_info('rennen_teilnehmer') WHERE name = 'avatar'");
        if (!$hatAvatar) {
            $this->pdo->exec('ALTER TABLE rennen_teilnehmer ADD COLUMN avatar INTEGER NOT NULL DEFAULT -1');
        }
    }

    private function schema(): void
    {
        $vorhanden = $this->typ === 'mysql'
            ? $this->eins("SELECT 1 AS x FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'geraete'")
            : $this->eins("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'geraete'");
        if ($vorhanden) {
            $this->aktualisiere();
            return;
        }
        $my = $this->typ === 'mysql';
        $text = $my ? 'VARCHAR(255)' : 'TEXT';
        $id = $my ? 'VARCHAR(64)' : 'TEXT';
        $gross = $my ? 'VARCHAR(600)' : 'TEXT';
        $zahl = $my ? 'BIGINT' : 'INTEGER';
        $kommazahl = $my ? 'DOUBLE' : 'REAL';
        $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin' : '';
        $auto = $my ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $sql = [
            "CREATE TABLE geraete (
               id $id PRIMARY KEY, schluessel_hash $text NOT NULL, name $text,
               pruefstelle INTEGER NOT NULL DEFAULT 0, gesperrt INTEGER NOT NULL DEFAULT 0, erstellt_am $zahl NOT NULL)$ende",
            "CREATE TABLE becher (
               seq $zahl NOT NULL, id $id PRIMARY KEY, geraet_id $id NOT NULL, name $text,
               pruefstelle INTEGER NOT NULL DEFAULT 0, besuch_id $text, stand $text NOT NULL, markt $text NOT NULL,
               stadt $text, saison INTEGER NOT NULL, datum $text, sorte $text, becher_nr INTEGER, preis $kommazahl, menge $kommazahl,
               notiz $gross, tags $text, geschmack INTEGER, geruch INTEGER, temperatur INTEGER, personal INTEGER,
               atmosphaere INTEGER, preis_leistung INTEGER, becher INTEGER,
               erstellt_am $zahl NOT NULL, eingegangen_am $zahl NOT NULL, versteckt INTEGER NOT NULL DEFAULT 0)$ende",
            'CREATE INDEX becher_seq ON becher(seq)',
            'CREATE INDEX becher_geraet ON becher(geraet_id, eingegangen_am)',
            'CREATE INDEX becher_besuch ON becher(besuch_id)',
            "CREATE TABLE limits (
               schluessel $id PRIMARY KEY, fenster $zahl NOT NULL, anzahl INTEGER NOT NULL, ablauf $zahl NOT NULL DEFAULT 0)$ende",
            "CREATE TABLE meldungen (
               id $auto, becher_id $id NOT NULL, geraet_id $id NOT NULL, grund $text NOT NULL, text $gross,
               erstellt_am $zahl NOT NULL, bearbeitet INTEGER NOT NULL DEFAULT 0,
               UNIQUE (becher_id, geraet_id))$ende",
            'CREATE INDEX meldungen_offen ON meldungen(bearbeitet, becher_id)',
            "CREATE TABLE zaehler (name $id PRIMARY KEY, wert $zahl NOT NULL)$ende",
            "INSERT INTO zaehler (name, wert) VALUES ('seq', 0)",
            ...$this->rennenSchema(),
            ...$this->fotosSchema(),
            ...$this->rueckSchema(),
        ];
        foreach ($sql as $s) {
            $this->pdo->exec($s);
        }
    }

    /** Tabellen des Schlittenfahrens (Beta). @return list<string> */
    private function rennenSchema(): array
    {
        $my = $this->typ === 'mysql';
        $text = $my ? 'VARCHAR(255)' : 'TEXT';
        $id = $my ? 'VARCHAR(64)' : 'TEXT';
        $zahl = $my ? 'BIGINT' : 'INTEGER';
        $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin' : '';
        return [
            "CREATE TABLE rennen (
               id $id PRIMARY KEY, name $text NOT NULL, ziel INTEGER NOT NULL, ersteller $id NOT NULL,
               erstellt_am $zahl NOT NULL, ende $zahl NOT NULL)$ende",
            "CREATE TABLE rennen_teilnehmer (
               rennen_id $id NOT NULL, geraet_id $id NOT NULL, kamel $text NOT NULL, farbe INTEGER NOT NULL, seit $zahl NOT NULL, fahrzeug INTEGER NOT NULL DEFAULT 0, avatar INTEGER NOT NULL DEFAULT -1,
               PRIMARY KEY (rennen_id, geraet_id))$ende",
        ];
    }

    /** Tabelle der Rückmeldungen aus der App. @return list<string> */
    private function rueckSchema(): array
    {
        $my = $this->typ === 'mysql';
        $id = $my ? 'VARCHAR(64)' : 'TEXT';
        $zahl = $my ? 'BIGINT' : 'INTEGER';
        $auto = $my ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin' : '';
        return [
            "CREATE TABLE rueckmeldungen (
               id $auto, geraet_id $id NOT NULL, text " . ($my ? 'TEXT' : 'TEXT') . " NOT NULL, seite " . ($my ? 'VARCHAR(64)' : 'TEXT') . ",
               erstellt_am $zahl NOT NULL, bearbeitet INTEGER NOT NULL DEFAULT 0, stimmung INTEGER)$ende",
            'CREATE INDEX rueckmeldungen_offen ON rueckmeldungen(bearbeitet, erstellt_am)',
        ];
    }

    /** Tabelle der Fotos (Base64-Text). @return list<string> */
    private function fotosSchema(): array
    {
        $my = $this->typ === 'mysql';
        $id = $my ? 'VARCHAR(64)' : 'TEXT';
        $zahl = $my ? 'BIGINT' : 'INTEGER';
        $lang = $my ? 'LONGTEXT' : 'TEXT';
        $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin' : '';
        return [
            "CREATE TABLE fotos (
               becher_id $id PRIMARY KEY, geraet_id $id NOT NULL, groesse INTEGER NOT NULL, gross $lang NOT NULL, klein $lang NOT NULL,
               erstellt_am $zahl NOT NULL, versteckt INTEGER NOT NULL DEFAULT 0)$ende",
            'CREATE INDEX fotos_geraet ON fotos(geraet_id)',
        ];
    }
}
