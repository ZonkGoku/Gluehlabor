<?php
// Tägliche Sicherung und Aufräumen. Nur für die Kommandozeile (Cronjob Manager in konsoleH), nie über den Browser.
//
//   php /pfad/zu/public_html/api/lib/sicherung.php
//
// SQLite: Kopie der Datenbank nach api/daten/sicherungen/gluehlabor-JJJJ-MM-TT.sqlite
// MySQL:  alle Tabellen als komprimierte JSON-Datei gluehlabor-JJJJ-MM-TT.json.gz
// Es bleiben die letzten 14 Sicherungen. Außerdem werden abgelaufene Zähler für den Missbrauchsschutz gelöscht.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/app.php';

const BEHALTEN = 14;
const TABELLEN = ['geraete', 'becher', 'meldungen', 'zaehler'];

/** @param array<string,mixed> $env */
function sichere(array $env, ?int $jetzt = null): string
{
    $jetzt ??= (int) round(microtime(true) * 1000);
    $cfg = $env['db'] ?? ['typ' => 'sqlite', 'datei' => dirname(__DIR__) . '/daten/gluehlabor.sqlite'];
    $daten = ($cfg['typ'] ?? 'sqlite') === 'sqlite' ? dirname($cfg['datei']) : dirname(__DIR__) . '/daten';
    $ziel = $daten . '/sicherungen';
    if (!is_dir($ziel) && !mkdir($ziel, 0750, true) && !is_dir($ziel)) {
        throw new RuntimeException('Ordner für Sicherungen lässt sich nicht anlegen: ' . $ziel);
    }
    file_put_contents($daten . '/.htaccess', "Require all denied\n");
    $tag = gmdate('Y-m-d', intdiv($jetzt, 1000));

    $db = new Db($cfg);
    raeumeAuf($db, $jetzt);

    if ($db->typ === 'sqlite') {
        $datei = "$ziel/gluehlabor-$tag.sqlite";
        if (is_file($datei)) {
            unlink($datei);
        }
        $db->pdo->exec('VACUUM INTO ' . $db->pdo->quote($datei));
    } else {
        $dump = [];
        foreach (TABELLEN as $t) {
            $dump[$t] = $db->alle("SELECT * FROM $t");
        }
        $datei = "$ziel/gluehlabor-$tag.json.gz";
        file_put_contents($datei, gzencode(json_encode($dump, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION) ?: '{}', 9));
    }
    if (filesize($datei) === 0) {
        throw new RuntimeException('Sicherung ist leer: ' . $datei);
    }

    // Rotation: nur die letzten BEHALTEN Sicherungen bleiben
    $alle = glob($ziel . '/gluehlabor-????-??-??.{sqlite,json.gz}', GLOB_BRACE) ?: [];
    sort($alle);
    foreach (array_slice($alle, 0, max(0, count($alle) - BEHALTEN)) as $alt) {
        unlink($alt);
    }
    return $datei;
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    $cfgDatei = dirname(__DIR__) . '/privat/config.php';
    if (!is_file($cfgDatei)) {
        fwrite(STDERR, "config.php fehlt\n");
        exit(1);
    }
    try {
        $datei = sichere(require $cfgDatei);
        echo 'Sicherung: ' . $datei . ' (' . round(filesize($datei) / 1024) . " KB)\n";
    } catch (Throwable $t) {
        fwrite(STDERR, 'Fehler: ' . $t->getMessage() . "\n");
        exit(1);
    }
}
