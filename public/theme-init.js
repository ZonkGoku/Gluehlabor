// Läuft vor dem ersten Zeichnen: setzt das gespeicherte Theme (hell, dunkel; sonst folgt es dem System),
// damit beim Laden nichts aufblitzt. Muss eine eigene Datei sein, weil die Seite keine Inline-Skripte erlaubt.
try {
  var t = localStorage.getItem('gluehlabor.theme');
  if (t === 'hell' || t === 'dunkel') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}

// Sparmodus: auf Android und schwachen Geräten ohne Unschärfe, Schnee und Leuchten (sonst friert die Anzeige ein). Eigene Wahl: gluehlabor.sparmodus = an | aus
try {
  var sp = localStorage.getItem('gluehlabor.sparmodus');
  var schwach = /Android/i.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (sp === 'an' || (sp !== 'aus' && schwach)) document.documentElement.setAttribute('data-lite', '');
} catch (e) {}
