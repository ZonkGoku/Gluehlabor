// Minimale Schnittstelle, die Cloudflare D1 erfüllt. So lässt sich der Server
// in Tests gegen SQLite (node:sqlite) laufen, ohne Cloudflare.

export interface D1Stmt {
  bind(...werte: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface D1Like {
  prepare(sql: string): D1Stmt;
  batch(stmts: D1Stmt[]): Promise<unknown[]>;
}
