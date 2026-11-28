-- Rückmeldung per Gesicht: 1 schlecht, 2 okay, 3 gut (optional). Der Text darf dann fehlen.
ALTER TABLE rueckmeldungen ADD COLUMN stimmung INTEGER;
