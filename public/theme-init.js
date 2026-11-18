// Läuft vor dem ersten Zeichnen: setzt das gespeicherte Theme (hell, dunkel; sonst folgt es dem System),
// damit beim Laden nichts aufblitzt. Muss eine eigene Datei sein, weil die Seite keine Inline-Skripte erlaubt.
try {
  var t = localStorage.getItem('gluehlabor.theme');
  if (t === 'hell' || t === 'dunkel') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
