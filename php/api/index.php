<?php
// Einstieg der API auf dem Webhosting. Alle Anfragen an /api/... landen hier (siehe .htaccess).
declare(strict_types=1);

require __DIR__ . '/lib/app.php';

header_remove('X-Powered-By');
ini_set('display_errors', '0');
$cfgDatei = __DIR__ . '/privat/config.php';
if (!is_file($cfgDatei)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"fehler":"Server ist noch nicht eingerichtet (api/privat/config.php fehlt)."}';
    exit;
}
/** @var array<string,mixed> $env */
$env = require $cfgDatei;

$kopf = [];
foreach ($_SERVER as $k => $v) {
    if (str_starts_with($k, 'HTTP_') && is_string($v)) {
        $kopf[strtolower(str_replace('_', '-', substr($k, 5)))] = $v;
    }
}
if (!isset($kopf['authorization'])) {
    $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if (is_string($auth)) {
        $kopf['authorization'] = $auth;
    }
}
foreach (['content-type' => 'CONTENT_TYPE'] as $name => $quelle) {
    if (isset($_SERVER[$quelle]) && is_string($_SERVER[$quelle])) {
        $kopf[$name] = $_SERVER[$quelle];
    }
}

$jetzt = (int) round(microtime(true) * 1000);
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt');
// Nur für automatische Tests (config.php: 'testmodus' => true): Zeit und Adresse von außen setzen.
if (($env['testmodus'] ?? false) === true) {
    if (isset($kopf['x-test-jetzt'])) {
        $jetzt = (int) $kopf['x-test-jetzt'];
    }
    if (isset($kopf['x-test-ip'])) {
        $ip = $kopf['x-test-ip'];
    }
}

$pfad = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$query = [];
parse_str((string) ($_SERVER['QUERY_STRING'] ?? ''), $query);
$body = (string) file_get_contents('php://input', false, null, 0, LIMITS['maxBodyBytes'] + 1);
$anfrage = new Anfrage((string) $_SERVER['REQUEST_METHOD'], $pfad, $query, $kopf, $body, $ip, $_SERVER['HTTP_HOST'] ?? null);

try {
    $dbCfg = $env['db'] ?? ['typ' => 'sqlite', 'datei' => __DIR__ . '/daten/gluehlabor.sqlite'];
    if (($dbCfg['typ'] ?? 'sqlite') === 'sqlite') {
        $ordner = dirname($dbCfg['datei']);
        if (!is_dir($ordner)) {
            mkdir($ordner, 0750, true);
        }
        if (!is_file($ordner . '/.htaccess')) {
            file_put_contents($ordner . '/.htaccess', "Require all denied\n");
        }
    }
    $db = new Db($dbCfg);
    $antwort = behandle($anfrage, $db, $env, $jetzt);
} catch (Throwable $t) {
    error_log('Glühlabor: ' . $t->getMessage());
    $antwort = new Antwort(500, ['fehler' => 'Interner Fehler.']);
}

http_response_code($antwort->status);
$kopf = ['Content-Type' => 'application/json; charset=utf-8', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-store'] + $antwort->kopf;
if ($pfad === '/api/status') {
    $oeffentlich = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    $kopf['X-Adresse-Erkannt'] = $oeffentlich ? 'ja' : 'nein';
}
foreach ($kopf as $name => $wert) {
    header($name . ': ' . $wert);
}
if ($antwort->daten !== null) {
    echo json_aus($antwort->daten);
}
