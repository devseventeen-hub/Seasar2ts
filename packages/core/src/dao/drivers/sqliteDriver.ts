import { Database } from "../database";
import { DbDialect, SQLiteDialect } from "../dialect";

export interface SQLiteConfig {
  filename?: string;
  client?: any; // sqlite3 or better-sqlite3 instance
}

/**
 * SQLite 用プラガブル DB Driver
 */
export class SQLiteDriver implements Database {
  readonly dialect: DbDialect = new SQLiteDialect();
  public inTransaction = false;
  private client?: any;
  private memoryStore: Map<string, any[]> = new Map();
  private queryLogs: { sql: string; params?: any }[] = [];

  constructor(public config: SQLiteConfig = {}) {
    this.client = config.client;
  }

  async begin(): Promise<void> {
    await this.beginTransaction();
  }

  async beginTransaction(): Promise<void> {
    if (this.client?.exec) {
      await this.client.exec("BEGIN TRANSACTION;");
    }
    this.inTransaction = true;
    this.queryLogs.push({ sql: "BEGIN TRANSACTION" });
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to commit");
    if (this.client?.exec) {
      await this.client.exec("COMMIT;");
    }
    this.inTransaction = false;
    this.queryLogs.push({ sql: "COMMIT" });
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to rollback");
    if (this.client?.exec) {
      await this.client.exec("ROLLBACK;");
    }
    this.inTransaction = false;
    this.queryLogs.push({ sql: "ROLLBACK" });
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
    const list = await this.queryMany<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    return this.queryList<T>(sql, params);
  }

  async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    this.queryLogs.push({ sql, params });

    if (this.client) {
      if (typeof this.client.all === "function") {
        return new Promise((resolve, reject) => {
          this.client.all(sql, params || [], (err: any, rows: T[]) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      }
      if (typeof this.client.prepare === "function") {
        const stmt = this.client.prepare(sql);
        return (params ? stmt.all(...params) : stmt.all()) as T[];
      }
    }

    // インメモリフォールバック
    const normalized = sql.toLowerCase();
    for (const [key, rows] of this.memoryStore.entries()) {
      if (normalized.includes(key.toLowerCase())) {
        return rows as T[];
      }
    }
    return [];
  }

  async execute(sql: string, params?: any): Promise<number> {
    this.queryLogs.push({ sql, params });

    if (this.client) {
      if (typeof this.client.run === "function") {
        return new Promise((resolve, reject) => {
          this.client.run(sql, params || [], function (this: any, err: any) {
            if (err) reject(err);
            else resolve(this?.changes ?? 1);
          });
        });
      }
      if (typeof this.client.prepare === "function") {
        const stmt = this.client.prepare(sql);
        const info = params ? stmt.run(...params) : stmt.run();
        return info?.changes ?? 1;
      }
    }
    return 1;
  }

  async close(): Promise<void> {
    if (this.client?.close) {
      if (typeof this.client.close === "function") {
        await this.client.close();
      }
    }
  }

  setMemoryData(table: string, rows: any[]): void {
    this.memoryStore.set(table, rows);
  }

  getQueryLogs(): { sql: string; params?: any }[] {
    return [...this.queryLogs];
  }
}
