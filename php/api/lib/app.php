<?php
// Community-Server für das Webhosting. Port von worker/src/app.ts: gleiche Endpunkte, gleiche Regeln, gleiche Antworten.
declare(strict_types=1);

require_once __DIR__ . '/regeln.php';
require_once __DIR__ . '/db.php';

const LIMITS = [
    'geraeteJeIpUndStunde' => 150,
    'becherJeGeraetUndTag' => 100,
    'becherJeGeraetUndTagPruefstelle' => 1000,
    'schreibzugriffeJeIpUndMinute' => 240,
    'meldungenJeGeraetUndTag' => 20,
    'rennenJeGeraetUndTag' => 5,
    'maxTeilnehmerJeRennen' => 12,
    'maxBodyBytes' => 64000,
    'maxBodyFoto' => 700000,
    'fotoMaxBytes' => 400000,
    'fotoKleinMaxBytes' => 40000,
    'fotosJeGeraetUndTag' => 30,
    'fotosGesamtMaxBytes' => 1500000000,
    'maxEintraegeJeAnfrage' => 20,
    'maxImport' => 100,
];
const MAX_STAND_IDS = 200;
const MELDEGRUENDE = ['unpassend', 'spam', 'falsch', 'persoenlich', 'sonstiges'];
const RENNEN_MIN = 2;
const RENNEN_MAX = 50;
const RENNEN_FARBEN = 8;
const FAHRZEUGE = 4;
const RENNEN_DAUER_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_MS = 60_000;
const STUNDE_MS = 3_600_000;

final class HttpFehler extends Exception
{
    /** @param array<string,mixed> $extra */
    public function __construct(public int $status, string $nachricht, public array $extra = [])
    {
        parent::__construct($nachricht);
    }
}

final class Antwort
{
    /** @param array<string,string> $kopf @param ?string $roh Antwort ohne JSON (z. B. ein Bild); dann bestimmt `$kopf` den Content-Type */
    public function __construct(public int $status, public mixed $daten, public array $kopf = [], public ?string $roh = null)
    {
    }
}

final class Anfrage
{
    /** @param array<string,string> $kopf Namen kleingeschrieben */
    public function __construct(
        public string $methode,
        public string $pfad,
        public array $query,
        public array $kopf,
        public string $body,
        public string $ip,
        public ?string $host = null,
    ) {
    }
}

function json_aus(mixed $daten): string
{
    return json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE) ?: '{}';
}

function gleich(string $a, string $b): bool
{
    return hash_equals($a, $b);
}

function adressSchluessel(array $env, string $art, string $ip, int $jetzt): string
{
    $salz = $env['ip_salz'] ?? $env['admin_token'] ?? '';
    return $art . ':' . substr(hash('sha256', $salz . '|' . intdiv($jetzt, TAG_MS) . '|' . $ip), 0, 24);
}

function raeumeAuf(Db $db, int $jetzt): int
{
    return $db->lauf('DELETE FROM limits WHERE ablauf < ?', [$jetzt - TAG_MS]);
}

/** @return array<string,mixed> */
function lesen(Anfrage $a, ?int $maxZeichen = null): array
{
    if (strlen($a->body) > ($maxZeichen ?? LIMITS['maxBodyBytes'])) {
        throw new HttpFehler(413, 'Anfrage zu groß.');
    }
    $erste = ltrim($a->body)[0] ?? '';
    $x = $erste === '{' ? json_decode($a->body, true, 32) : null;
    if (!is_array($x)) {
        throw new HttpFehler(400, 'Kein gültiges JSON.');
    }
    return $x;
}

/** Zähler je Schlüssel und Zeitfenster. true = noch erlaubt. */
function begrenze(Db $db, string $schluessel, int $fensterMs, int $max, int $jetzt): bool
{
    $fenster = intdiv($jetzt, $fensterMs);
    $ablauf = ($fenster + 1) * $fensterMs;
    if ($db->typ === 'mysql') {
        $db->lauf(
            'INSERT INTO limits (schluessel, fenster, anzahl, ablauf) VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE anzahl = IF(fenster = VALUES(fenster), anzahl + 1, 1), ablauf = VALUES(ablauf), fenster = VALUES(fenster)',
            [$schluessel, $fenster, $ablauf],
        );
    } else {
        $db->lauf(
            'INSERT INTO limits (schluessel, fenster, anzahl, ablauf) VALUES (?, ?, 1, ?)
             ON CONFLICT(schluessel) DO UPDATE SET
               anzahl = CASE WHEN fenster = excluded.fenster THEN anzahl + 1 ELSE 1 END,
               fenster = excluded.fenster, ablauf = excluded.ablauf',
            [$schluessel, $fenster, $ablauf],
        );
    }
    $z = $db->eins('SELECT anzahl FROM limits WHERE schluessel = ?', [$schluessel]);
    return (int) ($z['anzahl'] ?? 0) <= $max;
}

/** @return array<string,mixed> */
/** Fahrzeug aus der Anfrage: fehlt es, gilt 0 (Schlitten); sonst muss es eine ganze Zahl von 0 bis FAHRZEUGE - 1 sein. */
function fahrzeugAus(mixed $roh): int
{
    if ($roh === null) {
        return 0;
    }
    if (!is_int($roh) || $roh < 0 || $roh >= FAHRZEUGE) {
        throw new HttpFehler(400, 'Ungültiges Fahrzeug.');
    }
    return $roh;
}

function anmelden(Anfrage $a, Db $db): array
{
    $kopf = $a->kopf['authorization'] ?? $a->kopf['x-auth'] ?? '';
    if (preg_match('/^Bearer ([A-Za-z0-9_-]{16,64})\.([0-9a-f]{64})$/', $kopf, $m) !== 1) {
        throw new HttpFehler(401, 'Anmeldung fehlt.');
    }
    $g = $db->eins('SELECT * FROM geraete WHERE id = ?', [$m[1]]);
    if (!$g || !gleich((string) $g['schluessel_hash'], hash('sha256', $m[2]))) {
        throw new HttpFehler(401, 'Unbekanntes Gerät.');
    }
    if ((int) $g['gesperrt'] !== 0) {
        throw new HttpFehler(403, 'Dieses Gerät ist gesperrt.');
    }
    return $g;
}

/** Moderation darf, wer das Admin-Token kennt (Kommandozeile) oder ein Gerät ist, das sich als Prüfstelle ausgewiesen hat (Browser). */
function pruefeModeration(Anfrage $a, Db $db, array $env): void
{
    if (istAdmin($a, $env)) {
        return;
    }
    try {
        $g = anmelden($a, $db);
        if ((int) $g['pruefstelle'] !== 0) {
            return;
        }
    } catch (HttpFehler) {
        // kein gültiges Gerät
    }
    throw new HttpFehler(401, 'Nur für die Prüfstelle.');
}

function istAdmin(Anfrage $a, array $env): bool
{
    $kopf = $a->kopf['authorization'] ?? $a->kopf['x-auth'] ?? '';
    $token = (string) ($env['admin_token'] ?? '');
    return $token !== '' && preg_match('/^Bearer (.+)$/', $kopf, $m) === 1 && gleich($m[1], $token);
}

/** @param array<string,mixed> $z @return array<string,mixed> */
function alsEintrag(array $z): array
{
    if ((int) $z['versteckt'] !== 0) {
        return ['id' => $z['id'], 'versteckt' => true, 'seq' => (int) $z['seq']];
    }
    $n = static fn($v) => $v === null ? null : (int) $v;
    $e = [
        'id' => $z['id'],
        'seq' => (int) $z['seq'],
        'stand' => $z['stand'],
        'markt' => $z['markt'],
        'saison' => (int) $z['saison'],
        'noten' => [
            'geschmack' => $n($z['geschmack']),
            'geruch' => $n($z['geruch']),
            'temperatur' => $n($z['temperatur']),
            'personal' => $n($z['personal']),
            'atmosphaere' => $n($z['atmosphaere']),
            'preisLeistung' => $n($z['preis_leistung']),
            'becher' => $n($z['becher']),
        ],
        'erstelltAm' => (int) $z['erstellt_am'],
        'geraet' => $z['geraet_id'],
        'pruefstelle' => (int) $z['pruefstelle'] !== 0,
    ];
    if ($z['stadt']) {
        $e['stadt'] = $z['stadt'];
    }
    if ($z['datum']) {
        $e['datum'] = $z['datum'];
    }
    if ($z['sorte']) {
        $e['sorte'] = $z['sorte'];
    }
    if ($z['becher_nr'] !== null) {
        $e['becherNr'] = (int) $z['becher_nr'];
    }
    if (!empty($z['foto_am'])) {
        $e['foto'] = '/api/foto/' . $z['id'] . '?v=' . (int) $z['foto_am'];
    }
    if ($z['preis'] !== null) {
        $e['preis'] = (float) $z['preis'];
    }
    if ($z['menge'] !== null) {
        $e['menge'] = (float) $z['menge'];
    }
    if ($z['notiz']) {
        $e['notiz'] = $z['notiz'];
    }
    if ($z['name']) {
        $e['name'] = $z['name'];
    }
    if ($z['besuch_id']) {
        $e['besuchId'] = $z['besuch_id'];
    }
    return $e;
}

/** @param array<string,mixed> $e */
function fuegeEin(Db $db, array $e, string $geraetId, ?string $name, bool $pruefstelle, int $jetzt): void
{
    $db->transaktion(function () use ($db, $e, $geraetId, $name, $pruefstelle, $jetzt) {
        $seq = $db->naechsteSeq();
        $n = $e['noten'];
        $db->lauf(
            'INSERT INTO becher (seq, id, geraet_id, name, pruefstelle, besuch_id, stand, markt, stadt, saison, datum, sorte,
               becher_nr, preis, menge, notiz, geschmack, geruch, temperatur, personal, atmosphaere, preis_leistung, becher,
               erstellt_am, eingegangen_am, versteckt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
            [
                $seq, $e['id'], $geraetId, $name, $pruefstelle ? 1 : 0, $e['besuchId'], $e['stand'], $e['markt'], $e['stadt'],
                $e['saison'], $e['datum'], $e['sorte'], $e['becherNr'], $e['preis'], $e['menge'], $e['notiz'],
                $n['geschmack'], $n['geruch'], $n['temperatur'], $n['personal'], $n['atmosphaere'],
                $n['preisLeistung'], $n['becher'], $e['erstelltAm'], $jetzt,
            ],
        );
    });
}

/** Unterscheidet sich der gespeicherte Bestandsbecher vom Eintrag der CSV? @param array<string,mixed> $z @param array<string,mixed> $e */
function bestandGeaendert(array $z, array $e): bool
{
    $n = $e['noten'];
    $gleich = static fn($a, $b) => ($a === null ? null : (is_numeric($a) ? (float) $a : $a)) === ($b === null ? null : (is_numeric($b) ? (float) $b : $b));
    return !(
        $gleich($z['stand'], $e['stand']) && $gleich($z['markt'], $e['markt']) && $gleich($z['stadt'], $e['stadt'])
        && $gleich($z['saison'], $e['saison']) && $gleich($z['datum'], $e['datum']) && $gleich($z['sorte'], $e['sorte'])
        && $gleich($z['becher_nr'], $e['becherNr']) && $gleich($z['preis'], $e['preis']) && $gleich($z['notiz'], $e['notiz'])
        && $gleich($z['geschmack'], $n['geschmack']) && $gleich($z['geruch'], $n['geruch']) && $gleich($z['temperatur'], $n['temperatur'])
        && $gleich($z['personal'], $n['personal']) && $gleich($z['atmosphaere'], $n['atmosphaere'])
        && $gleich($z['preis_leistung'], $n['preisLeistung']) && $gleich($z['becher'], $n['becher'])
    );
}

/** Setzt Felder eines Bechers und gibt ihm eine neue Sync-Nummer. @param list<mixed> $werte */
function aendere(Db $db, string $setzen, array $werte, string $id): int
{
    return (int) $db->transaktion(function () use ($db, $setzen, $werte, $id) {
        $seq = $db->naechsteSeq();
        return $db->lauf("UPDATE becher SET $setzen, seq = ? WHERE id = ?", [...$werte, $seq, $id]);
    });
}

/** Gibt einer Bewertung eine neue Sync-Nummer, damit alle Geräte sie (mit geändertem Foto) noch einmal holen. */
function neueSeq(Db $db, string $id): void
{
    $db->transaktion(function () use ($db, $id) {
        $db->lauf('UPDATE becher SET seq = ? WHERE id = ?', [$db->naechsteSeq(), $id]);
    });
}

/** @return list<string> */
function erlaubteUrspruenge(array $env): array
{
    return array_values(array_filter(array_map('trim', (array) ($env['erlaubte_ursprunge'] ?? []))));
}

function gleicherUrsprung(Anfrage $a, ?string $ursprung): bool
{
    if ($ursprung === null || $a->host === null) {
        return false;
    }
    return preg_match('#^https?://#', $ursprung) === 1 && (parse_url($ursprung, PHP_URL_HOST) . (($p = parse_url($ursprung, PHP_URL_PORT)) ? ":$p" : '')) === $a->host;
}

function ursprungErlaubt(Anfrage $a, array $env, string $ursprung): bool
{
    return in_array($ursprung, erlaubteUrspruenge($env), true) || gleicherUrsprung($a, $ursprung);
}

/** @return array<string,string> */
function corsKopf(Anfrage $a, array $env, bool $nurLesen): array
{
    $ursprung = $a->kopf['origin'] ?? null;
    $basis = ['Vary' => 'Origin'];
    if ($nurLesen) {
        return $basis + ['Access-Control-Allow-Origin' => '*'];
    }
    if ($ursprung !== null && ursprungErlaubt($a, $env, $ursprung)) {
        return $basis + ['Access-Control-Allow-Origin' => $ursprung];
    }
    return $basis;
}

// ───────── Einstieg ─────────

function behandle(Anfrage $a, Db $db, array $env, int $jetzt): Antwort
{
    $pfad = rtrim($a->pfad, '/') ?: '/';
    $methode = strtoupper($a->methode);
    $nurLesen = $methode === 'GET' && ($pfad === '/api/becher' || $pfad === '/api/status' || str_starts_with($pfad, '/api/rennen/') || str_starts_with($pfad, '/api/foto/'));
    $cors = corsKopf($a, $env, $nurLesen);

    try {
        if ($methode === 'OPTIONS') {
            $ursprung = $a->kopf['origin'] ?? null;
            $ok = $ursprung === null || ursprungErlaubt($a, $env, $ursprung);
            return new Antwort($ok ? 204 : 403, null, corsKopf($a, $env, false) + [
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers' => 'Authorization, Content-Type, X-Auth',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
        if ($methode !== 'GET') {
            $ursprung = $a->kopf['origin'] ?? null;
            if ($ursprung !== null && !ursprungErlaubt($a, $env, $ursprung)) {
                throw new HttpFehler(403, 'Ursprung nicht erlaubt.');
            }
        }
        // Nur Schreibzugriffe werden gezählt (Lesen kostet keine Schreibzeile).
        if ($methode !== 'GET') {
            if (random_int(1, 50) === 1) {
                raeumeAuf($db, $jetzt);
            }
            if (!begrenze($db, adressSchluessel($env, 'schreiben', $a->ip, $jetzt), MIN_MS, LIMITS['schreibzugriffeJeIpUndMinute'], $jetzt)) {
                throw new HttpFehler(429, 'Zu viele Anfragen. Bitte kurz warten.');
            }
        }
        $antwort = route($a, $db, $env, $pfad, $methode, $jetzt);
        $antwort->kopf = $cors + $antwort->kopf;
        return $antwort;
    } catch (HttpFehler $f) {
        return new Antwort($f->status, ['fehler' => $f->getMessage()] + $f->extra, $cors);
    } catch (Throwable $t) {
        error_log('Glühlabor: ' . $t->getMessage());
        return new Antwort(500, ['fehler' => 'Interner Fehler.'], $cors);
    }
}

function route(Anfrage $a, Db $db, array $env, string $pfad, string $methode, int $jetzt): Antwort
{
    if ($pfad === '/api/status' && $methode === 'GET') {
        return new Antwort(200, ['ok' => true, 'zeit' => $jetzt]);
    }

    // ── Gerät anmelden ──
    if ($pfad === '/api/geraete' && $methode === 'POST') {
        if (!begrenze($db, adressSchluessel($env, 'geraete', $a->ip, $jetzt), STUNDE_MS, LIMITS['geraeteJeIpUndStunde'], $jetzt)) {
            throw new HttpFehler(429, 'Zu viele neue Geräte von dieser Adresse. Bitte später erneut versuchen.');
        }
        $b = lesen($a);
        if (!is_string($b['id'] ?? null) || preg_match('/^[A-Za-z0-9_-]{16,64}$/', $b['id']) !== 1) {
            throw new HttpFehler(400, 'Ungültige Kennung.');
        }
        if (!is_string($b['schluessel'] ?? null) || preg_match('/^[0-9a-f]{64}$/', $b['schluessel']) !== 1) {
            throw new HttpFehler(400, 'Ungültiger Schlüssel.');
        }
        if ($db->eins('SELECT id FROM geraete WHERE id = ?', [$b['id']])) {
            throw new HttpFehler(409, 'Diese Kennung ist schon vergeben.');
        }
        $db->lauf('INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES (?, ?, ?)', [$b['id'], hash('sha256', $b['schluessel']), $jetzt]);
        return new Antwort(201, ['ok' => true]);
    }

    // ── Eigene Daten ──
    if ($pfad === '/api/ich' && ($methode === 'GET' || $methode === 'PUT')) {
        $g = anmelden($a, $db);
        if ($methode === 'GET') {
            return new Antwort(200, ['id' => $g['id'], 'name' => $g['name'], 'pruefstelle' => (int) $g['pruefstelle'] !== 0]);
        }
        $b = lesen($a);
        $p = pruefeName($b['name'] ?? null, (int) $g['pruefstelle'] !== 0);
        if (!$p['ok']) {
            throw new HttpFehler(422, $p['grund']);
        }
        $db->lauf('UPDATE geraete SET name = ? WHERE id = ?', [$p['name'], $g['id']]);
        // Bisher namenlose Becher dieses Geräts bekommen den Namen nachträglich; schon benannte bleiben.
        $nachbenannt = 0;
        if ($p['name'] !== null) {
            foreach ($db->alle('SELECT id FROM becher WHERE geraet_id = ? AND name IS NULL', [$g['id']]) as $z) {
                aendere($db, 'name = ?', [$p['name']], (string) $z['id']);
                $nachbenannt++;
            }
        }
        return new Antwort(200, ['ok' => true, 'name' => $p['name'], 'nachbenannt' => $nachbenannt]);
    }

    if ($pfad === '/api/pruefstelle' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!begrenze($db, 'code:' . $g['id'], STUNDE_MS, 10, $jetzt)) {
            throw new HttpFehler(429, 'Zu viele Versuche.');
        }
        // Leerzeichen und Zeilenumbrüche am Rand zählen nicht (beim Einfügen ins Secret oder in die App rutschen sie leicht mit).
        $code = trim((string) ($env['pruefstelle_code'] ?? ''));
        if ($code === '') {
            throw new HttpFehler(503, 'Auf dem Server ist kein Prüfstellen-Code eingerichtet (Secret PRUEFSTELLE_CODE fehlt).');
        }
        if (!is_string($b['code'] ?? null) || !gleich(trim($b['code']), $code)) {
            throw new HttpFehler(403, 'Falscher Code.');
        }
        $db->lauf('UPDATE geraete SET pruefstelle = 1 WHERE id = ?', [$g['id']]);
        return new Antwort(200, ['ok' => true, 'pruefstelle' => true]);
    }

    // ── Becher ──
    if ($pfad === '/api/becher' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        $liste = $b['eintraege'] ?? null;
        if (!is_array($liste) || !array_is_list($liste) || count($liste) === 0 || count($liste) > LIMITS['maxEintraegeJeAnfrage']) {
            throw new HttpFehler(400, 'Bitte 1 bis ' . LIMITS['maxEintraegeJeAnfrage'] . ' Einträge senden.');
        }
        // Bewerten kann nur, wer einen Namen hat. Die Becher bleiben in der App „offen" und gehen mit dem Namen später durch.
        if ($g['name'] === null || $g['name'] === '') {
            $fehlt = [];
            foreach ($liste as $roh) {
                $fehlt[] = ['id' => is_array($roh) ? ($roh['id'] ?? null) : null, 'status' => 'name-fehlt', 'grund' => 'Bitte zuerst einen Namen eingeben.'];
            }
            return new Antwort(200, ['ergebnisse' => $fehlt]);
        }
        $limit = (int) $g['pruefstelle'] !== 0 ? LIMITS['becherJeGeraetUndTagPruefstelle'] : LIMITS['becherJeGeraetUndTag'];
        $schonHeute = (int) ($db->eins('SELECT COUNT(*) AS n FROM becher WHERE geraet_id = ? AND eingegangen_am > ?', [$g['id'], $jetzt - TAG_MS])['n'] ?? 0);
        $frei = max(0, $limit - $schonHeute);

        $ergebnisse = [];
        foreach ($liste as $roh) {
            $rohId = is_array($roh) ? ($roh['id'] ?? null) : null;
            $p = pruefeEinreichung($roh, $jetzt);
            if (!$p['ok']) {
                $ergebnisse[] = ['id' => $rohId, 'status' => 'abgelehnt', 'grund' => $p['grund']];
                continue;
            }
            $e = $p['eintrag'];
            // Preis-Leistung wird aus dem Preis berechnet: Ohne Preis nimmt der Server keine neue Bewertung an.
            if ($e['preis'] === null) {
                $ergebnisse[] = ['id' => $e['id'], 'status' => 'abgelehnt', 'grund' => 'Der Preis fehlt.'];
                continue;
            }
            $vorhanden = $db->eins('SELECT geraet_id FROM becher WHERE id = ?', [$e['id']]);
            if ($vorhanden) {
                $ergebnisse[] = $vorhanden['geraet_id'] === $g['id']
                    ? ['id' => $e['id'], 'status' => 'bereits']
                    : ['id' => $e['id'], 'status' => 'abgelehnt', 'grund' => 'ID ist schon vergeben.'];
                continue;
            }
            if ($frei <= 0) {
                $ergebnisse[] = ['id' => $e['id'], 'status' => 'zu-viele', 'grund' => 'Tageslimit erreicht.'];
                continue;
            }
            // Mehrere Bewertungen desselben Stands am selben Abend sind erlaubt (jeder Becher ist eine Bewertung); es bleibt beim Tageslimit.
            fuegeEin($db, $e, (string) $g['id'], $g['name'], (int) $g['pruefstelle'] !== 0, $jetzt);
            $frei--;
            $ergebnisse[] = ['id' => $e['id'], 'status' => 'ok'];
        }
        return new Antwort(200, ['ergebnisse' => $ergebnisse]);
    }

    // Eigene Bewertung nachträglich ändern: Noten, Preis, Größe, Sorte, Notiz. Stand, Ort, Zeitpunkt und Besuch bleiben.
    // Fehlen menge, sorte oder notiz (oder sind sie null), werden sie gelöscht. Dieselbe Prüfung wie beim Einreichen.
    if ($pfad === '/api/becher/aendern' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!is_string($b['id'] ?? null)) {
            throw new HttpFehler(400, 'Bewertung nötig.');
        }
        $z = $db->eins('SELECT * FROM becher WHERE id = ? AND geraet_id = ? AND versteckt = 0', [$b['id'], $g['id']]);
        if (!$z) {
            throw new HttpFehler(404, 'Bewertung nicht gefunden.');
        }
        $roh = alsEintrag($z);
        $roh['noten'] = $b['noten'] ?? null;
        $roh['preis'] = $b['preis'] ?? null;
        $roh['menge'] = $b['menge'] ?? null;
        $roh['sorte'] = $b['sorte'] ?? null;
        $roh['notiz'] = $b['notiz'] ?? null;
        $p = pruefeEinreichung($roh, (int) $z['erstellt_am']);
        if (!$p['ok']) {
            throw new HttpFehler(422, $p['grund']);
        }
        $e = $p['eintrag'];
        if ($e['preis'] === null) {
            throw new HttpFehler(422, 'Der Preis fehlt.');
        }
        $n = $e['noten'];
        aendere(
            $db,
            'sorte = ?, preis = ?, menge = ?, notiz = ?, geschmack = ?, geruch = ?, temperatur = ?, personal = ?, atmosphaere = ?, preis_leistung = ?, becher = ?',
            [$e['sorte'], $e['preis'], $e['menge'], $e['notiz'], $n['geschmack'], $n['geruch'], $n['temperatur'], $n['personal'], $n['atmosphaere'], $n['preisLeistung'], $n['becher']],
            (string) $z['id'],
        );
        return new Antwort(200, ['ok' => true]);
    }

    // ── Fotos ──
    // Ein Foto je Bewertung, nur vom Besitzer, nur mit ausdrücklicher Einwilligung (alle dürfen es sehen). JPEG als Base64.
    if ($pfad === '/api/foto' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a, LIMITS['maxBodyFoto']);
        if (!is_string($b['id'] ?? null)) {
            throw new HttpFehler(400, 'Bewertung nötig.');
        }
        if (($b['einwilligung'] ?? null) !== true) {
            throw new HttpFehler(422, 'Bitte bestätige, dass alle das Foto sehen dürfen.');
        }
        if (!$db->eins('SELECT id FROM becher WHERE id = ? AND geraet_id = ? AND versteckt = 0', [$b['id'], $g['id']])) {
            throw new HttpFehler(404, 'Bewertung nicht gefunden.');
        }
        $pruefeBild = static function (mixed $roh, int $max): int {
            if (!is_string($roh) || preg_match('/^[A-Za-z0-9+\/]+={0,2}$/', $roh) !== 1) {
                throw new HttpFehler(422, 'Das Foto ist kein gültiges Bild.');
            }
            if (!str_starts_with($roh, '/9j/')) {
                throw new HttpFehler(422, 'Das Foto muss ein JPEG sein.');
            }
            $bytes = intdiv(strlen($roh) * 3, 4) - (str_ends_with($roh, '==') ? 2 : (str_ends_with($roh, '=') ? 1 : 0));
            if ($bytes > $max) {
                throw new HttpFehler(413, 'Das Foto ist zu groß.');
            }
            return $bytes;
        };
        $groesse = $pruefeBild($b['gross'] ?? null, LIMITS['fotoMaxBytes']);
        $pruefeBild($b['klein'] ?? null, LIMITS['fotoKleinMaxBytes']);
        if (!begrenze($db, 'foto:' . $g['id'], TAG_MS, LIMITS['fotosJeGeraetUndTag'], $jetzt)) {
            throw new HttpFehler(429, 'Heute schon viele Fotos hochgeladen.');
        }
        $summe = (int) ($db->eins('SELECT COALESCE(SUM(groesse), 0) AS s FROM fotos')['s'] ?? 0);
        if ($summe + $groesse > LIMITS['fotosGesamtMaxBytes']) {
            throw new HttpFehler(507, 'Der Speicher für Fotos ist voll.');
        }
        $db->lauf('DELETE FROM fotos WHERE becher_id = ?', [$b['id']]);
        $db->lauf('INSERT INTO fotos (becher_id, geraet_id, groesse, gross, klein, erstellt_am, versteckt) VALUES (?, ?, ?, ?, ?, ?, 0)', [$b['id'], $g['id'], $groesse, $b['gross'], $b['klein'], $jetzt]);
        neueSeq($db, (string) $b['id']);
        return new Antwort(201, ['ok' => true]);
    }
    if ($pfad === '/api/foto/loeschen' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!is_string($b['id'] ?? null)) {
            throw new HttpFehler(400, 'Bewertung nötig.');
        }
        if ($db->lauf('DELETE FROM fotos WHERE becher_id = ? AND geraet_id = ?', [$b['id'], $g['id']]) === 0) {
            throw new HttpFehler(404, 'Foto nicht gefunden.');
        }
        neueSeq($db, (string) $b['id']);
        return new Antwort(200, ['ok' => true]);
    }
    if (str_starts_with($pfad, '/api/foto/') && $methode === 'GET') {
        $id = rawurldecode(substr($pfad, strlen('/api/foto/')));
        if (preg_match('/^[A-Za-z0-9_-]{8,64}$/', $id) !== 1) {
            throw new HttpFehler(404, 'Foto nicht gefunden.');
        }
        $z = $db->eins('SELECT f.gross AS gross, f.klein AS klein FROM fotos f JOIN becher b ON b.id = f.becher_id WHERE f.becher_id = ? AND f.versteckt = 0 AND b.versteckt = 0', [$id]);
        if (!$z) {
            throw new HttpFehler(404, 'Foto nicht gefunden.');
        }
        $bytes = base64_decode((string) (($a->query['g'] ?? '') === 'klein' ? $z['klein'] : $z['gross']), true);
        return new Antwort(200, null, ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'public, max-age=86400'], $bytes === false ? '' : $bytes);
    }

    if ($pfad === '/api/becher' && $methode === 'GET') {
        $nach = max(0, (int) floor((float) ($a->query['nach'] ?? 0)));
        $limit = (int) floor((float) ($a->query['limit'] ?? 200));
        $limit = min(500, max(1, $limit ?: 200));
        $zeilen = $db->alle('SELECT b.*, f.erstellt_am AS foto_am FROM becher b LEFT JOIN fotos f ON f.becher_id = b.id AND f.versteckt = 0 WHERE b.seq > ? ORDER BY b.seq ASC LIMIT ?', [$nach, $limit + 1]);
        $mehr = count($zeilen) > $limit;
        $seite = $mehr ? array_slice($zeilen, 0, $limit) : $zeilen;
        $letzte = $seite === [] ? $nach : (int) $seite[count($seite) - 1]['seq'];
        return new Antwort(200, ['eintraege' => array_map('alsEintrag', $seite), 'naechste' => $letzte, 'mehr' => $mehr], ['Cache-Control' => 'no-store']);
    }

    // ── Melden ──
    if ($pfad === '/api/melden' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!is_string($b['id'] ?? null) || !is_string($b['grund'] ?? null) || !in_array($b['grund'], MELDEGRUENDE, true)) {
            throw new HttpFehler(400, 'Becher und Grund nötig.');
        }
        $t = $b['text'] ?? null;
        if ($t !== null && !is_string($t)) {
            throw new HttpFehler(400, 'Der Text muss Text sein.');
        }
        $text = is_string($t) ? (mb_substr(saeubere($t), 0, 300, 'UTF-8') ?: null) : null;
        if (!begrenze($db, 'melden:' . $g['id'], TAG_MS, LIMITS['meldungenJeGeraetUndTag'], $jetzt)) {
            throw new HttpFehler(429, 'Heute schon viele Meldungen. Bitte morgen wieder.');
        }
        if (!$db->eins('SELECT id FROM becher WHERE id = ? AND versteckt = 0', [$b['id']])) {
            throw new HttpFehler(404, 'Becher nicht gefunden.');
        }
        $db->lauf($db->ignoriere() . ' INTO meldungen (becher_id, geraet_id, grund, text, erstellt_am) VALUES (?, ?, ?, ?, ?)', [$b['id'], $g['id'], $b['grund'], $text, $jetzt]);
        return new Antwort(200, ['ok' => true]);
    }

    // ── Schlittenfahren (Beta) ──
    if ($pfad === '/api/rennen' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        $rname = pruefeName($b['name'] ?? null);
        $kname = pruefeName($b['kamel'] ?? null);
        if (!$rname['ok'] || $rname['name'] === null) {
            throw new HttpFehler(422, 'Das Rennen braucht einen Namen.');
        }
        if (!$kname['ok'] || $kname['name'] === null) {
            throw new HttpFehler(422, 'Dein Schlitten braucht einen Namen.');
        }
        if (!is_int($b['ziel'] ?? null) || $b['ziel'] < RENNEN_MIN || $b['ziel'] > RENNEN_MAX) {
            throw new HttpFehler(400, 'Ungültiges Ziel.');
        }
        if (!is_int($b['farbe'] ?? null) || $b['farbe'] < 0 || $b['farbe'] >= RENNEN_FARBEN) {
            throw new HttpFehler(400, 'Ungültige Farbe.');
        }
        $fahrzeug = fahrzeugAus($b['fahrzeug'] ?? null);
        if (!begrenze($db, 'rennen:' . $g['id'], TAG_MS, LIMITS['rennenJeGeraetUndTag'], $jetzt)) {
            throw new HttpFehler(429, 'Heute schon viele Rennen angelegt.');
        }
        $zeichen = 'abcdefghijkmnpqrstuvwxyz23456789';
        $id = '';
        foreach (str_split(random_bytes(8)) as $c) {
            $id .= $zeichen[ord($c) % 32];
        }
        $db->lauf('INSERT INTO rennen (id, name, ziel, ersteller, erstellt_am, ende) VALUES (?, ?, ?, ?, ?, ?)', [$id, $rname['name'], $b['ziel'], $g['id'], $jetzt, $jetzt + RENNEN_DAUER_MS]);
        $db->lauf('INSERT INTO rennen_teilnehmer (rennen_id, geraet_id, kamel, farbe, seit, fahrzeug) VALUES (?, ?, ?, ?, ?, ?)', [$id, $g['id'], $kname['name'], $b['farbe'], $jetzt, $fahrzeug]);
        return new Antwort(201, ['ok' => true, 'id' => $id]);
    }
    if ($pfad === '/api/rennen/beitreten' && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!is_string($b['id'] ?? null) || preg_match('/^[a-z0-9]{8}$/', $b['id']) !== 1) {
            throw new HttpFehler(400, 'Ungültiges Rennen.');
        }
        $kname = pruefeName($b['kamel'] ?? null);
        if (!$kname['ok'] || $kname['name'] === null) {
            throw new HttpFehler(422, 'Dein Schlitten braucht einen Namen.');
        }
        if (!is_int($b['farbe'] ?? null) || $b['farbe'] < 0 || $b['farbe'] >= RENNEN_FARBEN) {
            throw new HttpFehler(400, 'Ungültige Farbe.');
        }
        $fahrzeug = fahrzeugAus($b['fahrzeug'] ?? null);
        $r = $db->eins('SELECT id, ende FROM rennen WHERE id = ?', [$b['id']]);
        if (!$r) {
            throw new HttpFehler(404, 'Rennen nicht gefunden.');
        }
        if ($db->eins('SELECT geraet_id FROM rennen_teilnehmer WHERE rennen_id = ? AND geraet_id = ?', [$b['id'], $g['id']])) {
            return new Antwort(200, ['ok' => true, 'schon' => true]);
        }
        if ((int) $r['ende'] < $jetzt) {
            throw new HttpFehler(410, 'Dieses Rennen ist vorbei.');
        }
        $n = $db->eins('SELECT COUNT(*) AS n FROM rennen_teilnehmer WHERE rennen_id = ?', [$b['id']]);
        if ((int) ($n['n'] ?? 0) >= LIMITS['maxTeilnehmerJeRennen']) {
            throw new HttpFehler(409, 'Das Rennen ist voll.');
        }
        $db->lauf('INSERT INTO rennen_teilnehmer (rennen_id, geraet_id, kamel, farbe, seit, fahrzeug) VALUES (?, ?, ?, ?, ?, ?)', [$b['id'], $g['id'], $kname['name'], $b['farbe'], $jetzt, $fahrzeug]);
        return new Antwort(200, ['ok' => true]);
    }
    if (($pfad === '/api/rennen/verlassen' || $pfad === '/api/rennen/loeschen') && $methode === 'POST') {
        $g = anmelden($a, $db);
        $b = lesen($a);
        if (!is_string($b['id'] ?? null) || preg_match('/^[a-z0-9]{8}$/', $b['id']) !== 1) {
            throw new HttpFehler(400, 'Ungültiges Rennen.');
        }
        $r = $db->eins('SELECT id, ersteller FROM rennen WHERE id = ?', [$b['id']]);
        if (!$r) {
            throw new HttpFehler(404, 'Rennen nicht gefunden.');
        }
        if ($pfad === '/api/rennen/loeschen') {
            if ((string) $r['ersteller'] !== (string) $g['id']) {
                throw new HttpFehler(403, 'Nur wer das Rennen angelegt hat, darf es löschen.');
            }
            $db->lauf('DELETE FROM rennen_teilnehmer WHERE rennen_id = ?', [$b['id']]);
            $db->lauf('DELETE FROM rennen WHERE id = ?', [$b['id']]);
            return new Antwort(200, ['ok' => true]);
        }
        $db->lauf('DELETE FROM rennen_teilnehmer WHERE rennen_id = ? AND geraet_id = ?', [$b['id'], $g['id']]);
        return new Antwort(200, ['ok' => true]);
    }
    if (str_starts_with($pfad, '/api/rennen/') && $methode === 'GET') {
        $id = substr($pfad, strlen('/api/rennen/'));
        if (preg_match('/^[a-z0-9]{8}$/', $id) !== 1) {
            throw new HttpFehler(404, 'Rennen nicht gefunden.');
        }
        $r = $db->eins('SELECT id, name, ziel, ersteller, erstellt_am, ende FROM rennen WHERE id = ?', [$id]);
        if (!$r) {
            throw new HttpFehler(404, 'Rennen nicht gefunden.');
        }
        $t = $db->alle('SELECT geraet_id, kamel, farbe, seit, fahrzeug FROM rennen_teilnehmer WHERE rennen_id = ? ORDER BY seit ASC, geraet_id ASC', [$id]);
        return new Antwort(200, [
            'rennen' => ['id' => $r['id'], 'name' => $r['name'], 'ziel' => (int) $r['ziel'], 'ersteller' => $r['ersteller'], 'erstellt_am' => (int) $r['erstellt_am'], 'ende' => (int) $r['ende']],
            'teilnehmer' => array_map(fn($z) => ['geraet' => $z['geraet_id'], 'kamel' => $z['kamel'], 'farbe' => (int) $z['farbe'], 'fahrzeug' => (int) $z['fahrzeug'], 'seit' => (int) $z['seit']], $t),
        ], ['Cache-Control' => 'no-store']);
    }

    // ── Moderation ──
    if (str_starts_with($pfad, '/api/admin/')) {
        pruefeModeration($a, $db, $env);
        if ($pfad === '/api/admin/meldungen' && $methode === 'GET') {
            $zeilen = $db->alle(
                'SELECT m.becher_id AS id, COUNT(*) AS anzahl, MAX(m.erstellt_am) AS zuletzt, GROUP_CONCAT(m.grund) AS gruende,
                        MAX(b.stand) AS stand, MAX(b.markt) AS markt, MAX(b.name) AS name, MAX(b.notiz) AS notiz,
                        MAX(b.versteckt) AS versteckt, MAX(b.geraet_id) AS geraet_id
                   FROM meldungen m LEFT JOIN becher b ON b.id = m.becher_id
                  WHERE m.bearbeitet = 0
                  GROUP BY m.becher_id
                  ORDER BY anzahl DESC, zuletzt DESC
                  LIMIT 100',
            );
            foreach ($zeilen as &$z) {
                $z['anzahl'] = (int) $z['anzahl'];
                $z['zuletzt'] = (int) $z['zuletzt'];
                $z['versteckt'] = $z['versteckt'] === null ? null : (int) $z['versteckt'];
            }
            return new Antwort(200, ['meldungen' => $zeilen]);
        }
        if ($methode !== 'POST') {
            throw new HttpFehler(404, 'Nicht gefunden.');
        }
        $b = lesen($a);

        if ($pfad === '/api/admin/meldung-verwerfen') {
            if (!is_string($b['id'] ?? null)) {
                throw new HttpFehler(400, 'id nötig.');
            }
            $r = $db->lauf('UPDATE meldungen SET bearbeitet = 1 WHERE becher_id = ?', [$b['id']]);
            return new Antwort(200, ['ok' => true, 'betroffen' => $r]);
        }

        if ($pfad === '/api/admin/verstecken') {
            if (!is_string($b['id'] ?? null) || !is_bool($b['versteckt'] ?? null)) {
                throw new HttpFehler(400, 'id und versteckt nötig.');
            }
            $r = aendere($db, 'versteckt = ?', [$b['versteckt'] ? 1 : 0], $b['id']);
            if ($r === 0) {
                throw new HttpFehler(404, 'Becher nicht gefunden.');
            }
            if ($b['versteckt']) {
                $db->lauf('UPDATE meldungen SET bearbeitet = 1 WHERE becher_id = ?', [$b['id']]);
            }
            return new Antwort(200, ['ok' => true]);
        }

        // Stand umbenennen oder zusammenführen: gibt allen genannten Bewertungen denselben Stand, Markt und dieselbe Stadt.
        if ($pfad === '/api/admin/foto-verstecken') {
            if (!is_string($b['id'] ?? null) || !is_bool($b['versteckt'] ?? null)) {
                throw new HttpFehler(400, 'id und versteckt nötig.');
            }
            if ($db->lauf('UPDATE fotos SET versteckt = ? WHERE becher_id = ?', [$b['versteckt'] ? 1 : 0, $b['id']]) === 0) {
                throw new HttpFehler(404, 'Foto nicht gefunden.');
            }
            neueSeq($db, (string) $b['id']);
            return new Antwort(200, ['ok' => true]);
        }
        if ($pfad === '/api/admin/stand-aendern') {
            $ids = $b['ids'] ?? null;
            if (!is_array($ids) || !array_is_list($ids) || count($ids) === 0 || count($ids) > MAX_STAND_IDS) {
                throw new HttpFehler(400, 'Bitte 1 bis ' . MAX_STAND_IDS . ' Bewertungen nennen.');
            }
            foreach ($ids as $id) {
                if (!is_string($id)) {
                    throw new HttpFehler(400, 'Bitte 1 bis ' . MAX_STAND_IDS . ' Bewertungen nennen.');
                }
            }
            $stand = pruefeText($b['stand'] ?? null, 'Stand', GRENZEN['stand'], true);
            if (!$stand['ok']) {
                throw new HttpFehler(422, $stand['grund']);
            }
            $markt = pruefeText($b['markt'] ?? null, 'Markt', GRENZEN['markt'], true);
            if (!$markt['ok']) {
                throw new HttpFehler(422, $markt['grund']);
            }
            $stadt = pruefeText($b['stadt'] ?? null, 'Stadt', GRENZEN['stadt'], false);
            if (!$stadt['ok']) {
                throw new HttpFehler(422, $stadt['grund']);
            }
            $betroffen = 0;
            foreach ($ids as $id) {
                if ($db->eins('SELECT id FROM becher WHERE id = ? AND versteckt = 0', [$id])) {
                    aendere($db, 'stand = ?, markt = ?, stadt = ?', [$stand['wert'], $markt['wert'], $stadt['wert']], $id);
                    $betroffen++;
                }
            }
            return new Antwort(200, ['ok' => true, 'betroffen' => $betroffen]);
        }

        // Bewertungen endgültig entfernen (Testeinträge, Unfug): Inhalt und Name werden gelöscht, ein Platzhalter bleibt,
        // damit andere Geräte die Bewertung verlieren. Anders als „verstecken" ist das nicht umkehrbar.
        if ($pfad === '/api/admin/entfernen') {
            $ids = $b['ids'] ?? null;
            if (!is_array($ids) || !array_is_list($ids) || count($ids) === 0 || count($ids) > MAX_STAND_IDS) {
                throw new HttpFehler(400, 'Bitte 1 bis ' . MAX_STAND_IDS . ' Bewertungen nennen.');
            }
            foreach ($ids as $id) {
                if (!is_string($id)) {
                    throw new HttpFehler(400, 'Bitte 1 bis ' . MAX_STAND_IDS . ' Bewertungen nennen.');
                }
            }
            $betroffen = 0;
            foreach ($ids as $id) {
                if ($db->eins('SELECT id FROM becher WHERE id = ?', [$id])) {
                    aendere(
                        $db,
                        "versteckt = 1, name = NULL, notiz = NULL, stadt = NULL, stand = '-', markt = '-', besuch_id = NULL, geschmack = NULL, geruch = NULL, temperatur = NULL, personal = NULL, atmosphaere = NULL, preis_leistung = NULL, becher = NULL, preis = NULL, menge = NULL",
                        [],
                        $id,
                    );
                    $betroffen++;
                }
                $db->lauf('DELETE FROM meldungen WHERE becher_id = ?', [$id]);
                $db->lauf('DELETE FROM fotos WHERE becher_id = ?', [$id]);
            }
            return new Antwort(200, ['ok' => true, 'betroffen' => $betroffen]);
        }

        // Zugang entziehen (Handy verloren): alle Geräte verlieren die Prüfstellen-Rechte, außer dem genannten. Danach den Code ändern.
        if ($pfad === '/api/admin/pruefstelle-zuruecksetzen') {
            $behalten = is_string($b['behalten'] ?? null) ? $b['behalten'] : '';
            $r = $db->lauf("UPDATE geraete SET pruefstelle = 0 WHERE pruefstelle = 1 AND id != 'bestand-pruefstelle' AND id != ?", [$behalten]);
            return new Antwort(200, ['ok' => true, 'betroffen' => $r]);
        }

        if ($pfad === '/api/admin/sperren') {
            if (!is_string($b['geraet'] ?? null) || !is_bool($b['gesperrt'] ?? null)) {
                throw new HttpFehler(400, 'geraet und gesperrt nötig.');
            }
            $r = $db->lauf('UPDATE geraete SET gesperrt = ? WHERE id = ?', [$b['gesperrt'] ? 1 : 0, $b['geraet']]);
            if ($r === 0 && !$db->eins('SELECT id FROM geraete WHERE id = ?', [$b['geraet']])) {
                throw new HttpFehler(404, 'Gerät nicht gefunden.');
            }
            $zeilen = $db->alle('SELECT id FROM becher WHERE geraet_id = ?', [$b['geraet']]);
            foreach ($zeilen as $z) {
                aendere($db, 'versteckt = ?', [$b['gesperrt'] ? 1 : 0], (string) $z['id']);
            }
            return new Antwort(200, ['ok' => true, 'betroffen' => count($zeilen)]);
        }

        // Löschen auf Anfrage (Art. 17 DSGVO)
        if ($pfad === '/api/admin/loeschen') {
            if (!is_string($b['geraet'] ?? null) || !in_array($b['modus'] ?? null, ['name', 'alles'], true)) {
                throw new HttpFehler(400, 'geraet und modus (name oder alles) nötig.');
            }
            if (!$db->eins('SELECT id FROM geraete WHERE id = ?', [$b['geraet']])) {
                throw new HttpFehler(404, 'Gerät nicht gefunden.');
            }
            $zeilen = $db->alle('SELECT id FROM becher WHERE geraet_id = ?', [$b['geraet']]);
            foreach ($zeilen as $z) {
                if ($b['modus'] === 'name') {
                    aendere($db, 'name = NULL', [], (string) $z['id']);
                } else {
                    aendere(
                        $db,
                        "versteckt = 1, name = NULL, notiz = NULL, stadt = NULL, stand = '-', markt = '-', besuch_id = NULL,
                         geschmack = NULL, geruch = NULL, temperatur = NULL, personal = NULL, atmosphaere = NULL,
                         preis_leistung = NULL, becher = NULL, preis = NULL, menge = NULL",
                        [],
                        (string) $z['id'],
                    );
                }
            }
            if ($b['modus'] === 'name') {
                $db->lauf('UPDATE geraete SET name = NULL WHERE id = ?', [$b['geraet']]);
            } else {
                $db->lauf("UPDATE geraete SET name = NULL, gesperrt = 1, schluessel_hash = '-' WHERE id = ?", [$b['geraet']]);
            }
            if ($b['modus'] === 'alles') {
                $db->lauf('DELETE FROM fotos WHERE geraet_id = ?', [$b['geraet']]);
            }
            $db->lauf('DELETE FROM meldungen WHERE geraet_id = ? OR becher_id IN (SELECT id FROM (SELECT id FROM becher WHERE geraet_id = ?) AS t)', [$b['geraet'], $b['geraet']]);
            return new Antwort(200, ['ok' => true, 'betroffen' => count($zeilen)]);
        }

        if ($pfad === '/api/admin/import') {
            $liste = $b['eintraege'] ?? null;
            if (!is_array($liste) || !array_is_list($liste) || count($liste) === 0 || count($liste) > LIMITS['maxImport']) {
                throw new HttpFehler(400, 'Bitte 1 bis ' . LIMITS['maxImport'] . ' Einträge senden.');
            }
            $db->lauf($db->ignoriere() . " INTO geraete (id, schluessel_hash, name, pruefstelle, erstellt_am) VALUES ('bestand-pruefstelle', '-', 'Prüfstelle', 1, ?)", [$jetzt]);
            $neu = 0;
            $aktualisiert = 0;
            $abgelehnt = [];
            foreach ($liste as $roh) {
                $erst = is_array($roh) && istZahl($roh['erstelltAm'] ?? null) ? $roh['erstelltAm'] : $jetzt;
                // Bestandsdaten dürfen älter sein als das Einreichfenster der App.
                $p = pruefeEinreichung(is_array($roh) ? ['erstelltAm' => (int) min(max($erst, $jetzt - 100 * TAG_MS), $jetzt)] + $roh : $roh, $jetzt);
                if (!$p['ok']) {
                    $abgelehnt[] = ['id' => is_array($roh) ? ($roh['id'] ?? null) : null, 'grund' => $p['grund']];
                    continue;
                }
                $e = $p['eintrag'];
                $e['erstelltAm'] = (int) $erst;
                $z = $db->eins('SELECT * FROM becher WHERE id = ?', [$e['id']]);
                if ($z) {
                    // Bestandsdaten lassen sich über die CSV korrigieren (gleiche ID, anderer Inhalt); die Sync-Nummer steigt.
                    if ($z['geraet_id'] === 'bestand-pruefstelle' && bestandGeaendert($z, $e)) {
                        $n = $e['noten'];
                        aendere(
                            $db,
                            'stand = ?, markt = ?, stadt = ?, saison = ?, datum = ?, sorte = ?, becher_nr = ?, preis = ?, notiz = ?,
                             geschmack = ?, geruch = ?, temperatur = ?, personal = ?, atmosphaere = ?, preis_leistung = ?, becher = ?',
                            [
                                $e['stand'], $e['markt'], $e['stadt'], $e['saison'], $e['datum'], $e['sorte'], $e['becherNr'], $e['preis'], $e['notiz'],
                                $n['geschmack'], $n['geruch'], $n['temperatur'], $n['personal'], $n['atmosphaere'], $n['preisLeistung'], $n['becher'],
                            ],
                            $e['id'],
                        );
                        $aktualisiert++;
                    }
                    continue;
                }
                fuegeEin($db, $e, 'bestand-pruefstelle', 'Prüfstelle', true, $jetzt);
                $neu++;
            }
            return new Antwort(200, ['neu' => $neu, 'aktualisiert' => $aktualisiert, 'abgelehnt' => $abgelehnt]);
        }
    }

    throw new HttpFehler(404, 'Nicht gefunden.');
}
