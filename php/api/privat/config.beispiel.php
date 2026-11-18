<?php
// Kopie als config.php anlegen (wird nie ins Repository eingecheckt) und ausfüllen.
// Der Ordner api/privat/ ist per .htaccess für den Zugriff von außen gesperrt.
return [
    'admin_token' => 'MINDESTENS-24-ZUFALLSZEICHEN',
    'pruefstelle_code' => 'GEHEIMER-CODE-FUER-DAVID-UND-PHILIP',
    'ip_salz' => 'ZUFALLSZEICHEN-FUER-DEN-ADRESSEN-HASH',
    'erlaubte_ursprunge' => ['https://gluehlabor.de', 'https://www.gluehlabor.de'],
    // SQLite (einfach, eine Datei in api/daten/) oder MySQL (Zugangsdaten aus konsoleH):
    'db' => ['typ' => 'sqlite', 'datei' => dirname(__DIR__) . '/daten/gluehlabor.sqlite'],
    // 'db' => ['typ' => 'mysql', 'host' => 'localhost', 'name' => '...', 'benutzer' => '...', 'passwort' => '...'],
];
