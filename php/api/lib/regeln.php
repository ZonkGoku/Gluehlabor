<?php
// Regeln für Bewertungen von Fremden. Port von src/lib/community.ts (App und Server prüfen mit denselben Regeln).
// Ändert sich dort etwas, muss es hier mitziehen; php/test prüft beides gegen dieselben Fälle.
declare(strict_types=1);

const TAG_IDS = ['wuerzig', 'suess', 'stark', 'wassrig', 'heiss', 'lau', 'nett', 'voll'];
const GRENZEN = ['stand' => 80, 'markt' => 80, 'stadt' => 60, 'notiz' => 500, 'name' => 24, 'nameMin' => 2];
const RESERVIERTE_NAMEN = ['david', 'philip', 'prüfstelle', 'pruefstelle', 'admin', 'becherwerk', 'gluehlabor', 'glühlabor', 'moderator'];
const KRITERIEN = ['geschmack', 'geruch', 'temperatur', 'personal', 'atmosphaere', 'preisLeistung', 'becher'];
const SORTEN = ['rot', 'weiss', 'kirsch', 'winzer', 'feuerzangen', 'alkoholfrei', 'sonstiges'];
const STADT_MUSTER = "/^[\\p{L}][\\p{L} .'’()\\/-]*$/u";
const TAG_MS = 86_400_000;

function istZahl(mixed $x): bool
{
    return is_int($x) || (is_float($x) && is_finite($x));
}

/** Ganzzahl im Sinn von JavaScript: 3 und 3.0 zählen, 3.5 nicht. */
function istGanz(mixed $x): bool
{
    return is_int($x) || (is_float($x) && is_finite($x) && floor($x) === $x);
}

function saeubere(string $s): string
{
    if (class_exists('Normalizer')) {
        $n = Normalizer::normalize($s, Normalizer::FORM_C);
        if ($n !== false) {
            $s = $n;
        }
    }
    $s = preg_replace('/[\x{0000}-\x{001f}\x{007f}-\x{009f}\x{200b}-\x{200f}\x{202a}-\x{202e}\x{2066}-\x{2069}]/u', '', $s) ?? '';
    $s = preg_replace('/[\s\x{00a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]+/u', ' ', $s) ?? '';
    return trim($s, " \t\n\r\0\x0B");
}

function hatLink(string $s): bool
{
    return preg_match('/(https?:|www\.|@|:\/\/)/i', $s) === 1;
}

function laenge(string $s): int
{
    return mb_strlen($s, 'UTF-8');
}

/** @return array{ok:true,name:?string}|array{ok:false,grund:string} */
function pruefeName(mixed $roh, bool $istPruefstelle = false): array
{
    if ($roh === null) {
        return ['ok' => true, 'name' => null];
    }
    if (!is_string($roh)) {
        return ['ok' => false, 'grund' => 'Der Name muss Text sein.'];
    }
    $name = saeubere($roh);
    if ($name === '') {
        return ['ok' => true, 'name' => null];
    }
    if (laenge($name) < GRENZEN['nameMin']) {
        return ['ok' => false, 'grund' => 'Mindestens ' . GRENZEN['nameMin'] . ' Zeichen.'];
    }
    if (laenge($name) > GRENZEN['name']) {
        return ['ok' => false, 'grund' => 'Höchstens ' . GRENZEN['name'] . ' Zeichen.'];
    }
    if (hatLink($name)) {
        return ['ok' => false, 'grund' => 'Links und Adressen sind im Namen nicht erlaubt.'];
    }
    if (preg_match("/^[\\p{L}\\p{N}][\\p{L}\\p{N} .'_-]*$/u", $name) !== 1) {
        return ['ok' => false, 'grund' => "Erlaubt sind Buchstaben, Ziffern, Leerzeichen und . ' _ -"];
    }
    if (!$istPruefstelle && in_array(mb_strtolower($name, 'UTF-8'), RESERVIERTE_NAMEN, true)) {
        return ['ok' => false, 'grund' => 'Dieser Name ist reserviert.'];
    }
    return ['ok' => true, 'name' => $name];
}

function gueltigesDatum(string $s): bool
{
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) !== 1) {
        return false;
    }
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

function datumMs(string $s): int
{
    [$j, $m, $t] = array_map('intval', explode('-', $s));
    return gmmktime(0, 0, 0, $m, $t, $j) * 1000;
}

/** @return array{ok:true,wert:?string}|array{ok:false,grund:string} */
function pruefeText(mixed $wert, string $feld, int $max, bool $pflicht): array
{
    if ($wert === null || $wert === '') {
        return $pflicht ? ['ok' => false, 'grund' => "$feld fehlt."] : ['ok' => true, 'wert' => null];
    }
    if (!is_string($wert)) {
        return ['ok' => false, 'grund' => "$feld muss Text sein."];
    }
    $s = saeubere($wert);
    if ($s === '') {
        return $pflicht ? ['ok' => false, 'grund' => "$feld fehlt."] : ['ok' => true, 'wert' => null];
    }
    if (laenge($s) > $max) {
        return ['ok' => false, 'grund' => "$feld ist zu lang (höchstens $max Zeichen)."];
    }
    if (hatLink($s)) {
        return ['ok' => false, 'grund' => "$feld: Links sind nicht erlaubt."];
    }
    return ['ok' => true, 'wert' => $s];
}

/**
 * Prüft und bereinigt einen eingereichten Becher.
 * @return array{ok:true,eintrag:array<string,mixed>}|array{ok:false,grund:string}
 */
function pruefeEinreichung(mixed $e, int $jetzt): array
{
    if (!is_array($e) || ($e !== [] && array_is_list($e)) || $e === []) {
        return ['ok' => false, 'grund' => 'Kein Eintrag.'];
    }
    if (!is_string($e['id'] ?? null) || preg_match('/^[A-Za-z0-9_-]{8,64}$/', $e['id']) !== 1) {
        return ['ok' => false, 'grund' => 'Ungültige ID.'];
    }
    $stand = pruefeText($e['stand'] ?? null, 'Stand', GRENZEN['stand'], true);
    if (!$stand['ok']) {
        return $stand;
    }
    $markt = pruefeText($e['markt'] ?? null, 'Markt', GRENZEN['markt'], true);
    if (!$markt['ok']) {
        return $markt;
    }
    $stadt = pruefeText($e['stadt'] ?? null, 'Stadt', GRENZEN['stadt'], false);
    if (!$stadt['ok']) {
        return $stadt;
    }
    if ($stadt['wert'] !== null && preg_match(STADT_MUSTER, $stadt['wert']) !== 1) {
        return ['ok' => false, 'grund' => 'Ungültige Stadt.'];
    }
    $notiz = pruefeText($e['notiz'] ?? null, 'Notiz', GRENZEN['notiz'], false);
    if (!$notiz['ok']) {
        return $notiz;
    }

    // Schnell-Tags: nur bekannte Ids, ohne Doppelte
    $tags = [];
    if (array_key_exists('tags', $e) && $e['tags'] !== null) {
        if (!is_array($e['tags']) || !array_is_list($e['tags']) || count($e['tags']) > count(TAG_IDS)) {
            return ['ok' => false, 'grund' => 'Ungültiges Schlagwort.'];
        }
        foreach ($e['tags'] as $x) {
            if (!is_string($x) || !in_array($x, TAG_IDS, true)) {
                return ['ok' => false, 'grund' => 'Ungültiges Schlagwort.'];
            }
        }
        $tags = array_values(array_unique($e['tags']));
    }

    $jahr = (int) gmdate('Y', intdiv($jetzt, 1000));
    $saison = $e['saison'] ?? null;
    if (!istGanz($saison) || $saison < 2025 || $saison > $jahr + 1) {
        return ['ok' => false, 'grund' => 'Ungültige Saison.'];
    }
    $erstellt = $e['erstelltAm'] ?? null;
    if (!istZahl($erstellt)) {
        return ['ok' => false, 'grund' => 'Ungültiger Zeitpunkt.'];
    }
    if ($erstellt < $jetzt - 120 * TAG_MS || $erstellt > $jetzt + TAG_MS) {
        return ['ok' => false, 'grund' => 'Zeitpunkt außerhalb des erlaubten Bereichs.'];
    }

    $datum = $e['datum'] ?? null;
    if ($datum !== null) {
        if (!is_string($datum) || !gueltigesDatum($datum)) {
            return ['ok' => false, 'grund' => 'Ungültiges Datum.'];
        }
        if (datumMs($datum) > $jetzt + 2 * TAG_MS) {
            return ['ok' => false, 'grund' => 'Datum liegt in der Zukunft.'];
        }
    }
    $sorte = $e['sorte'] ?? null;
    if ($sorte !== null && !(is_string($sorte) && in_array($sorte, SORTEN, true))) {
        return ['ok' => false, 'grund' => 'Ungültige Sorte.'];
    }
    $becherNr = $e['becherNr'] ?? null;
    if ($becherNr !== null && (!istGanz($becherNr) || $becherNr < 1 || $becherNr > 7)) {
        return ['ok' => false, 'grund' => 'Becher-Nr. muss 1 bis 7 sein.'];
    }
    $preis = $e['preis'] ?? null;
    if ($preis !== null && (!istZahl($preis) || $preis < 0 || $preis > 50)) {
        return ['ok' => false, 'grund' => 'Ungültiger Preis.'];
    }
    $menge = $e['menge'] ?? null;
    if ($menge !== null && (!istZahl($menge) || $menge < 0.1 || $menge > 1)) {
        return ['ok' => false, 'grund' => 'Ungültige Menge.'];
    }
    $besuch = $e['besuchId'] ?? null;
    if ($besuch !== null && (!is_string($besuch) || preg_match('/^[A-Za-z0-9_-]{4,32}$/', $besuch) !== 1)) {
        return ['ok' => false, 'grund' => 'Ungültige Besuchs-Nr.'];
    }

    $roh = $e['noten'] ?? null;
    if (!is_array($roh)) {
        return ['ok' => false, 'grund' => 'Noten fehlen.'];
    }
    $noten = [];
    foreach (KRITERIEN as $k) {
        $n = $roh[$k] ?? null;
        if ($n !== null && !(istGanz($n) && $n >= 1 && $n <= 10)) {
            return ['ok' => false, 'grund' => "Ungültige Note bei $k."];
        }
        $noten[$k] = $n === null ? null : (int) $n;
    }
    if (count(array_filter($noten, static fn($n) => $n !== null)) === 0) {
        return ['ok' => false, 'grund' => 'Mindestens eine Note ist nötig.'];
    }

    $eintrag = [
        'id' => $e['id'],
        'stand' => $stand['wert'],
        'markt' => $markt['wert'],
        'saison' => (int) $saison,
        'noten' => $noten,
        'erstelltAm' => (int) round($erstellt),
        'stadt' => $stadt['wert'],
        'datum' => is_string($datum) ? $datum : null,
        'sorte' => is_string($sorte) ? $sorte : null,
        'becherNr' => $becherNr === null ? null : (int) $becherNr,
        'preis' => $preis === null ? null : round($preis * 100) / 100,
        'menge' => $menge === null ? null : round($menge * 100) / 100,
        'notiz' => $notiz['wert'],
        'tags' => $tags === [] ? null : $tags,
        'besuchId' => is_string($besuch) ? $besuch : null,
    ];
    return ['ok' => true, 'eintrag' => $eintrag];
}

/** Der Stand ohne Groß/Klein, Satzzeichen, Leerraum und Emoji. Port von standKern in community.ts. */
function standKern(string $stand): string
{
    $s = mb_strtolower(saeubere($stand), 'UTF-8');
    return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', $s) ?? '');
}

/** Derselbe Stand: gleicher Name (Kern) in derselben Stadt. Port von standIdent. */
function standIdent(string $stand, ?string $stadt): string
{
    return standKern($stand) . '|' . mb_strtolower(saeubere($stadt ?? ''), 'UTF-8');
}

/** Der Abend einer Bewertung: das Datum, sonst der Tag der Erfassung (UTC). Port von abendVon. */
function abendVon(?string $datum, int $erstelltAm): string
{
    return $datum !== null && $datum !== '' ? $datum : gmdate('Y-m-d', intdiv($erstelltAm, 1000));
}
