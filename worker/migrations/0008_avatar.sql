-- Figur („Gesicht") auf dem Schlitten: Nummer der vorgefertigten Figur (src/lib/avatare.ts), -1 = keine. Keine Fotos, nur Zeichnungen, die alle sehen.
ALTER TABLE rennen_teilnehmer ADD COLUMN avatar INTEGER NOT NULL DEFAULT -1;
