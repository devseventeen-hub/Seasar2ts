import { Database } from "../database";
import { DbDialect, MySQLDialect } from "../dialect";
import {
  DbConnectionPool,
  PooledConnection,
  PoolConfig,
  PoolStatus,
  GenericConnectionPool
} from "../pool";

export interface MySQLConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  client?: any; // mysql2/promise Pool or Connection instance
}

export interface MySQLPoolConfig extends MySQLConfig {
  pool?: PoolConfig;
}

/**
 * テストおよび単体実行用のインメモリ MySQL ドライバー
 */
export class MySQLDriver implements Database {
  readonly dialect: DbDialect = new MySQLDialect();
  public inTransaction = false;
  private memoryStore: Map<string, any[]> = new Map();
  private queryLogs: { sql: string; params?: any }[] = [];

  constructor(public config: MySQLConfig = {}) {}

  async begin(): Promise<void> {
    await this.beginTransaction();
  }

  async beginTransaction(): Promise<void> {
    if (this.config.client?.query) {
      await this.config.client.query("START TRANSACTION");
    }
    this.inTransaction = true;
    this.queryLogs.push({ sql: "START TRANSACTION" });
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to commit");
    if (this.config.client?.query) {
      await this.config.client.query("COMMIT");
    }
    this.inTransaction = false;
    this.queryLogs.push({ sql: "COMMIT" });
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to rollback");
    if (this.config.client?.query) {
      await this.config.client.query("ROLLBACK");
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

    if (this.config.client?.execute) {
      const [rows] = await this.config.client.execute(sql, params || []);
      return (rows || []) as T[];
    }

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

    if (this.config.client?.execute) {
      const [result] = await this.config.client.execute(sql, params || []);
      return result.affectedRows ?? 1;
    }
    return 1;
  }

  async close(): Promise<void> {
    if (this.config.client?.end) {
      await this.config.client.end();
    }
  }

  setMemoryData(table: string, rows: any[]): void {
    this.memoryStore.set(table, rows);
  }

  getQueryLogs(): { sql: string; params?: any }[] {
    return [...this.queryLogs];
  }
}

/**
 * MySQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
export class MySQLPoolDriver implements Database, DbConnectionPool {
  readonly dialect: DbDialect = new MySQLDialect();
  private poolInstance: DbConnectionPool;
  private activeTxConnection?: PooledConnection;

  constructor(public config: MySQLPoolConfig = {}) {
    if (config.client && typeof config.client.getConnection === "function") {
      // Native mysql2/promise pool wrapper
      const myPool = config.client;
      let connCounter = 0;
      this.poolInstance = {
        async acquire(): Promise<PooledConnection> {
          const rawConn = await myPool.getConnection();
          const connId = `mysql_conn_${++connCounter}`;
          let released = false;

          const pooledConn: PooledConnection = {
            connectionId: connId,
            get isReleased() {
              return released;
            },
            dialect: new MySQLDialect(),
            async release() {
              if (released) return;
              released = true;
              rawConn.release();
            },
            async begin() {
              await rawConn.query("START TRANSACTION");
            },
            async beginTransaction() {
              await rawConn.query("START TRANSACTION");
            },
            async commit() {
              await rawConn.query("COMMIT");
            },
            async rollback() {
              await rawConn.query("ROLLBACK");
            },
            async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
              const list = await this.queryList<T>(sql, params);
              return list.length > 0 ? list[0] : null;
            },
            async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
              return this.queryList<T>(sql, params);
            },
            async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
              const [rows] = await rawConn.execute(sql, params || []);
              return (rows || []) as T[];
            },
            async execute(sql: string, params?: any): Promise<number> {
              const [result] = await rawConn.execute(sql, params || []);
              return result.affectedRows ?? 1;
            },
            async close() {
              await this.release();
            }
          };

          return pooledConn;
        },
        async withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T> {
          const conn = await this.acquire();
          try {
            return await fn(conn);
          } finally {
            if (!conn.isReleased) {
              await conn.release();
            }
          }
        },
        async close(): Promise<void> {
          if (myPool.end) {
            await myPool.end();
          }
        },
        getStatus(): PoolStatus {
          return {
            total: 0,
            active: 0,
            idle: 0,
            waiting: 0
          };
        }
      };
    } else {
      // In-memory or standalone GenericConnectionPool
      this.poolInstance = new GenericConnectionPool(
        config.pool,
        async () => new MySQLDriver(config)
      );
    }
  }

  // DbConnectionPool methods
  acquire(): Promise<PooledConnection> {
    return this.poolInstance.acquire();
  }

  withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T> {
    return this.poolInstance.withConnection(fn);
  }

  getStatus(): PoolStatus {
    return this.poolInstance.getStatus();
  }

  async close(): Promise<void> {
    if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
      await this.activeTxConnection.release();
      this.activeTxConnection = undefined;
    }
    await this.poolInstance.close();
  }

  // Database / DbConnection methods
  async begin(): Promise<void> {
    await this.beginTransaction();
  }

  async beginTransaction(): Promise<void> {
    if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
      this.activeTxConnection = await this.acquire();
    }
    await this.activeTxConnection.beginTransaction();
  }

  async commit(): Promise<void> {
    if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
      throw new Error("No transaction active to commit");
    }
    try {
      await this.activeTxConnection.commit();
    } finally {
      await this.activeTxConnection.release();
      this.activeTxConnection = undefined;
    }
  }

  async rollback(): Promise<void> {
    if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
      throw new Error("No transaction active to rollback");
    }
    try {
      await this.activeTxConnection.rollback();
    } finally {
      await this.activeTxConnection.release();
      this.activeTxConnection = undefined;
    }
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
    if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
      return this.activeTxConnection.queryOne<T>(sql, params);
    }
    return this.withConnection(conn => conn.queryOne<T>(sql, params));
  }

  async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    return this.queryList<T>(sql, params);
  }

  async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
      return this.activeTxConnection.queryList<T>(sql, params);
    }
    return this.withConnection(conn => conn.queryList<T>(sql, params));
  }

  async execute(sql: string, params?: any): Promise<number> {
    if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
      return this.activeTxConnection.execute(sql, params);
    }
    return this.withConnection(conn => conn.execute(sql, params));
  }
}
