import { Database } from "../database";
import { DbDialect, PostgresDialect } from "../dialect";

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | any;
  client?: any; // pg Pool or Client instance
}

/**
 * PostgreSQL 用プラガブル DB Driver
 */
export class PostgresDriver implements Database {
  readonly dialect: DbDialect = new PostgresDialect();
  public inTransaction = false;
  private client?: any;
  private memoryStore: Map<string, any[]> = new Map();
  private queryLogs: { sql: string; params?: any }[] = [];

  constructor(public config: PostgresConfig = {}) {
    this.client = config.client;
  }

  async begin(): Promise<void> {
    await this.beginTransaction();
  }

  async beginTransaction(): Promise<void> {
    if (this.client?.query) {
      await this.client.query("BEGIN");
    }
    this.inTransaction = true;
    this.queryLogs.push({ sql: "BEGIN" });
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to commit");
    if (this.client?.query) {
      await this.client.query("COMMIT");
    }
    this.inTransaction = false;
    this.queryLogs.push({ sql: "COMMIT" });
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to rollback");
    if (this.client?.query) {
      await this.client.query("ROLLBACK");
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

    if (this.client?.query) {
      const res = await this.client.query(sql, params || []);
      return (res.rows || []) as T[];
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

    if (this.client?.query) {
      const res = await this.client.query(sql, params || []);
      return res.rowCount ?? 1;
    }
    return 1;
  }

  async close(): Promise<void> {
    if (this.client?.end) {
      await this.client.end();
    }
  }

  setMemoryData(table: string, rows: any[]): void {
    this.memoryStore.set(table, rows);
  }

  getQueryLogs(): { sql: string; params?: any }[] {
    return [...this.queryLogs];
  }
}
