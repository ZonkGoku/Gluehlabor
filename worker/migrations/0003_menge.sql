-- Größe der Tasse in Litern (z. B. 0.25). Ohne Angabe gilt 0,2 l. Dient der Preis-Leistung (Preis auf 0,2 l umgerechnet).
ALTER TABLE becher ADD COLUMN menge REAL;
