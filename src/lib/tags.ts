// Schnell-Tags statt Notiz: acht antippbare Schlagwörter zum Glühwein und zum Stand. Die Ids prüft auch der Server (TAG_IDS in regeln.php muss gleich sein).
export const TAGS = [
  { id: 'wuerzig', label: 'Würzig' },
  { id: 'suess', label: 'Zu süß' },
  { id: 'stark', label: 'Stark' },
  { id: 'wassrig', label: 'Wässrig' },
  { id: 'heiss', label: 'Schön heiß' },
  { id: 'lau', label: 'Nur lauwarm' },
  { id: 'nett', label: 'Nettes Personal' },
  { id: 'voll', label: 'Viel los' },
] as const;
export const TAG_IDS: readonly string[] = TAGS.map((t) => t.id);
export const tagLabel = (id: string): string => TAGS.find((t) => t.id === id)?.label ?? id;
