// Eine ältere Datenbank (ohne Spalte „menge", wie auf dem Webhosting vor dieser Änderung) muss beim Start der PHP-Fassung
// von selbst nachziehen, ohne Daten zu verlieren.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

describe('PHP-Datenbank wird aktualisiert', () => {
  it('ergänzt die Spalte menge und behält die vorhandenen Becher', () => {
    const datei = join(mkdtempSync(join(tmpdir(), 'gl-mig-')), 'alt.sqlite');
    const db = new DatabaseSync(datei);
    db.exec(readFileSync('worker/migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('worker/migrations/0002_limits_meldungen.sql', 'utf8'));
    db.exec('CREATE TABLE zaehler (name TEXT PRIMARY KEY, wert INTEGER NOT NULL); INSERT INTO zaehler VALUES (\'seq\', 1)');
    db.exec("INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES ('g', 'h', 1)");
    db.exec("INSERT INTO becher (seq, id, geraet_id, stand, markt, saison, erstellt_am, eingegangen_am, preis) VALUES (1, 'alt', 'g', 'Chrom', 'M', 2026, 1, 1, 4.5)");
    db.close();
    const spalten = () => {
      const d = new DatabaseSync(datei, { readOnly: true });
      const namen = (d.prepare("SELECT name FROM pragma_table_info('becher')").all() as { name: string }[]).map((x) => x.name);
      d.close();
      return namen;
    };
    expect(spalten()).not.toContain('menge');
    const php = '$d = new Db(["typ" => "sqlite", "datei" => $argv[1]]); echo $d->eins("SELECT preis FROM becher WHERE id = ?", ["alt"])["preis"];';
    for (let i = 0; i < 2; i++) {
      // zweimal: der zweite Start darf nichts mehr ändern und nicht fehlschlagen
      const aus = execFileSync('php', ['-r', `require "php/api/lib/db.php"; ${php}`, datei], { encoding: 'utf8' });
      expect(aus).toBe('4.5');
    }
    expect(spalten()).toContain('menge');
  });
});
