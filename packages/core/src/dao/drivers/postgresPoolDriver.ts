import { Database } from "../database";
import { DbDialect, PostgresDialect } from "../dialect";
import {
  DbConnectionPool,
  PooledConnection,
  PoolConfig,
  PoolStatus,
  GenericConnectionPool
} from "../pool";
import { PostgresDriver, PostgresConfig } from "./postgresDriver";

export interface PostgresPoolConfig extends PostgresConfig {
  pool?: PoolConfig;
}

/**
 * PostgreSQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
export class PostgresPoolDriver implements Database, DbConnectionPool {
  readonly dialect: DbDialect = new PostgresDialect();
  private poolInstance: DbConnectionPool;
  private activeTxConnection?: PooledConnection;

  constructor(public config: PostgresPoolConfig = {}) {
    if (config.client && typeof config.client.connect === "function") {
      // Native pg.Pool wrapper
      const pgPool = config.client;
      let connCounter = 0;
      this.poolInstance = {
        async acquire(): Promise<PooledConnection> {
          const client = await pgPool.connect();
          const connId = `pg_conn_${++connCounter}`;
          let released = false;

          const pooledConn: PooledConnection = {
            connectionId: connId,
            get isReleased() {
              return released;
            },
            dialect: new PostgresDialect(),
            async release() {
              if (released) return;
              released = true;
              client.release();
            },
            async begin() {
              await client.query("BEGIN");
            },
            async beginTransaction() {
              await client.query("BEGIN");
            },
            async commit() {
              await client.query("COMMIT");
            },
            async rollback() {
              await client.query("ROLLBACK");
            },
            async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
              const list = await this.queryList<T>(sql, params);
              return list.length > 0 ? list[0] : null;
            },
            async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
              return this.queryList<T>(sql, params);
            },
            async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
              const res = await client.query(sql, params || []);
              return (res.rows || []) as T[];
            },
            async execute(sql: string, params?: any): Promise<number> {
              const res = await client.query(sql, params || []);
              return res.rowCount ?? 1;
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
          if (pgPool.end) {
            await pgPool.end();
          }
        },
        getStatus(): PoolStatus {
          const total = pgPool.totalCount ?? 0;
          const idle = pgPool.idleCount ?? 0;
          return {
            total,
            active: total - idle,
            idle,
            waiting: pgPool.waitingCount ?? 0
          };
        }
      };
    } else {
      // In-memory or standalone GenericConnectionPool
      this.poolInstance = new GenericConnectionPool(
        config.pool,
        async () => new PostgresDriver(config)
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
