/**
 * Minimal ambient declaration for Bun's built-in SQLite driver.
 *
 * Bun resolves `bun:sqlite` natively at runtime — this file only satisfies
 * `tsc` (which has no knowledge of Bun built-ins). It covers the subset used
 * by src/sync-state.ts, not the full Bun API.
 *
 * Consequence: any module importing `bun:sqlite` MUST be run under `bun`,
 * never plain `node`. sync-state.ts is only ever loaded by scripts/sync.mjs.
 */
declare module 'bun:sqlite' {
  export interface Changes {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export class Statement<R = unknown> {
    get(...params: unknown[]): R | null;
    all(...params: unknown[]): R[];
    run(...params: unknown[]): Changes;
  }

  export class Database {
    constructor(filename?: string, options?: unknown);
    run(sql: string, ...params: unknown[]): Changes;
    exec(sql: string): void;
    query<R = unknown>(sql: string): Statement<R>;
    prepare<R = unknown>(sql: string): Statement<R>;
    transaction<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void;
    close(): void;
  }
}
