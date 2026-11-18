// Moderation von der Kommandozeile.
//   API_URL=https://… ADMIN_TOKEN=… npx tsx worker/scripts/moderation.ts <befehl> [argumente]
//
//   liste                         offene Meldungen
//   verstecken <becher-id>        Becher ausblenden (erledigt die Meldungen)
//   einblenden <becher-id>        wieder einblenden
//   verwerfen <becher-id>         Meldungen verwerfen, Becher bleibt sichtbar
//   sperren <geraet-id>           Gerät sperren und alle seine Becher ausblenden
//   entsperren <geraet-id>        Gerät entsperren
//   loeschen <geraet-id> <name|alles>   Löschen auf Anfrage (Name oder alle Bewertungen eines Geräts)
export {};

const API_URL = (process.env.API_URL ?? '').replace(/\/+$/, '');
const TOKEN = process.env.ADMIN_TOKEN ?? '';
const [befehl, a, b] = process.argv.slice(2);
if (!API_URL || !TOKEN || !befehl) {
  console.error('API_URL und ADMIN_TOKEN setzen und einen Befehl angeben (siehe Kopf der Datei).');
  process.exit(1);
}

async function senden(pfad: string, body?: unknown): Promise<unknown> {
  const res = await fetch(API_URL + pfad, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const daten = (await res.json()) as { fehler?: string };
  if (!res.ok) {
    console.error(`Fehler ${res.status}: ${daten.fehler}`);
    process.exit(1);
  }
  return daten;
}

const braucht = (x: string | undefined, was: string) => {
  if (!x) {
    console.error(`${was} fehlt.`);
    process.exit(1);
  }
  return x;
};

switch (befehl) {
  case 'liste': {
    const { meldungen } = (await senden('/api/admin/meldungen')) as { meldungen: Record<string, unknown>[] };
    if (meldungen.length === 0) console.log('Keine offenen Meldungen.');
    for (const m of meldungen) {
      console.log(`${m.anzahl}× ${m.gruende}  "${m.stand}" (${m.markt}) von ${m.name ?? 'Anonym'}${m.notiz ? `\n    Notiz: ${m.notiz}` : ''}\n    becher: ${m.id}   gerät: ${m.geraet_id}`);
    }
    break;
  }
  case 'verstecken':
  case 'einblenden':
    console.log(await senden('/api/admin/verstecken', { id: braucht(a, 'becher-id'), versteckt: befehl === 'verstecken' }));
    break;
  case 'verwerfen':
    console.log(await senden('/api/admin/meldung-verwerfen', { id: braucht(a, 'becher-id') }));
    break;
  case 'sperren':
  case 'entsperren':
    console.log(await senden('/api/admin/sperren', { geraet: braucht(a, 'geraet-id'), gesperrt: befehl === 'sperren' }));
    break;
  case 'loeschen':
    console.log(await senden('/api/admin/loeschen', { geraet: braucht(a, 'geraet-id'), modus: braucht(b, 'modus (name oder alles)') }));
    break;
  default:
    console.error(`Unbekannter Befehl: ${befehl}`);
    process.exit(1);
}
