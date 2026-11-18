<?php
// Testhilfe: liest {"name":[...], "text":[...], "einreichung":[...], "adresse":[...]} von stdin, gibt die Ergebnisse als JSON aus.
declare(strict_types=1);
require __DIR__ . '/../api/lib/app.php';
$in = json_decode((string) stream_get_contents(STDIN), true);
$aus = ['name' => [], 'text' => [], 'einreichung' => [], 'adresse' => []];
foreach ($in['name'] as [$wert, $pruef]) {
    $aus['name'][] = pruefeName($wert, $pruef);
}
foreach ($in['text'] as [$wert, $max, $pflicht]) {
    $aus['text'][] = pruefeText($wert, 'Feld', $max, $pflicht);
}
foreach ($in['einreichung'] as [$wert, $jetzt]) {
    $aus['einreichung'][] = pruefeEinreichung($wert, $jetzt);
}
foreach ($in['adresse'] as [$salz, $art, $ip, $jetzt]) {
    $aus['adresse'][] = adressSchluessel(['ip_salz' => $salz], $art, $ip, $jetzt);
}
echo json_aus($aus);
