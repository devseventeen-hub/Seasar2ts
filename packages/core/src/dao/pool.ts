import { Database, DbConnection } from "./database";
import { DbDialect } from "./dialect";

export interface PoolConfig {
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
}

export interface PooledConnection extends Database {
  /** プールから貸し出された接続の識別子 */
  readonly connectionId: string;
  /** 接続をプールに返却する */
  release(): Promise<void>;
  /** 接続が現在返却済みかどうか */
  readonly isReleased: boolean;
}

export interface PoolStatus {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface DbConnectionPool {
  /** プールから接続を1つ取得する */
  acquire(): Promise<PooledConnection>;
  /** スコープ関数を実行し、完了時に自動返却する */
  withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T>;
  /** プールの終了・全接続のクローズ */
  close(): Promise<void>;
  /** プールの現在稼働状況 (アクティブ数、アイドル数等) */
  getStatus(): PoolStatus;
}

export function isConnectionPool(obj: any): obj is DbConnectionPool {
  return obj != null && typeof obj.acquire === "function" && typeof obj.withConnection === "function";
}

interface InternalConnectionHolder {
  id: string;
  conn: Database;
  lastUsed: number;
}

interface Waiter {
  resolve: (conn: PooledConnection) => void;
  reject: (err: Error) => void;
  timer: any;
}

/**
 * 汎用コネクションプール実装基盤
 */
export class GenericConnectionPool implements DbConnectionPool {
  public readonly min: number;
  public readonly max: number;
  public readonly acquireTimeoutMillis: number;
  public readonly idleTimeoutMillis: number;

  private idleList: InternalConnectionHolder[] = [];
  private activeMap: Map<string, InternalConnectionHolder> = new Map();
  private waitQueue: Waiter[] = [];
  private connectionCounter = 0;
  private isClosed = false;

  constructor(
    config: PoolConfig = {},
    private connectionFactory: () => Promise<Database>,
    private connectionDestroyer?: (conn: Database) => Promise<void>
  ) {
    this.min = config.min ?? 1;
    this.max = config.max ?? 10;
    this.acquireTimeoutMillis = config.acquireTimeoutMillis ?? 10000;
    this.idleTimeoutMillis = config.idleTimeoutMillis ?? 30000;
  }

  async acquire(): Promise<PooledConnection> {
    if (this.isClosed) {
      throw new Error("Cannot acquire connection from a closed pool");
    }

    // 1. Check idle list
    while (this.idleList.length > 0) {
      const holder = this.idleList.pop()!;
      // Optional idle timeout check
      this.activeMap.set(holder.id, holder);
      return this.wrapConnection(holder);
    }

    // 2. Can create a new connection?
    if (this.activeMap.size < this.max) {
      const id = `conn_${++this.connectionCounter}`;
      const conn = await this.connectionFactory();
      const holder: InternalConnectionHolder = { id, conn, lastUsed: Date.now() };
      this.activeMap.set(id, holder);
      return this.wrapConnection(holder);
    }

    // 3. Pool is saturated, queue waiter
    return new Promise<PooledConnection>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitQueue.findIndex(w => w.timer === timer);
        if (idx !== -1) {
          this.waitQueue.splice(idx, 1);
        }
        reject(new Error(`Connection acquisition timed out after ${this.acquireTimeoutMillis}ms (pool exhausted)`));
      }, this.acquireTimeoutMillis);

      this.waitQueue.push({ resolve, reject, timer });
    });
  }

  async withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T> {
    const conn = await this.acquire();
    try {
      return await fn(conn);
    } finally {
      if (!conn.isReleased) {
        await conn.release();
      }
    }
  }

  async releaseConnection(connId: string): Promise<void> {
    const holder = this.activeMap.get(connId);
    if (!holder) return; // already released

    this.activeMap.delete(connId);

    if (this.isClosed) {
      if (this.connectionDestroyer) {
        await this.connectionDestroyer(holder.conn);
      }
      return;
    }

    holder.lastUsed = Date.now();

    // Check waiters
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      clearTimeout(waiter.timer);
      this.activeMap.set(holder.id, holder);
      waiter.resolve(this.wrapConnection(holder));
      return;
    }

    // Return to idle list
    this.idleList.push(holder);
  }

  getStatus(): PoolStatus {
    return {
      total: this.activeMap.size + this.idleList.length,
      active: this.activeMap.size,
      idle: this.idleList.length,
      waiting: this.waitQueue.length
    };
  }

  async close(): Promise<void> {
    this.isClosed = true;

    // Reject all waiters
    while (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Pool is closing"));
    }

    // Destroy idle connections
    const destroyPromises: Promise<void>[] = [];
    for (const h of this.idleList) {
      if (this.connectionDestroyer) {
        destroyPromises.push(this.connectionDestroyer(h.conn));
      } else if (h.conn.close) {
        destroyPromises.push(h.conn.close());
      }
    }
    this.idleList = [];

    // Destroy active connections
    for (const h of this.activeMap.values()) {
      if (this.connectionDestroyer) {
        destroyPromises.push(this.connectionDestroyer(h.conn));
      } else if (h.conn.close) {
        destroyPromises.push(h.conn.close());
      }
    }
    this.activeMap.clear();

    await Promise.all(destroyPromises);
  }

  private wrapConnection(holder: InternalConnectionHolder): PooledConnection {
    let released = false;
    const pool = this;
    const underlying = holder.conn;

    return {
      get connectionId() {
        return holder.id;
      },
      get isReleased() {
        return released;
      },
      get dialect() {
        return underlying.dialect;
      },
      async release() {
        if (released) return;
        released = true;
        await pool.releaseConnection(holder.id);
      },
      async begin() {
        if (released) throw new Error("Connection is already released");
        return await underlying.begin();
      },
      async beginTransaction() {
        if (released) throw new Error("Connection is already released");
        return await underlying.beginTransaction();
      },
      async commit() {
        if (released) throw new Error("Connection is already released");
        return await underlying.commit();
      },
      async rollback() {
        if (released) throw new Error("Connection is already released");
        return await underlying.rollback();
      },
      async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
        if (released) throw new Error("Connection is already released");
        return await underlying.queryOne<T>(sql, params);
      },
      async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
        if (released) throw new Error("Connection is already released");
        return await underlying.queryMany<T>(sql, params);
      },
      async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
        if (released) throw new Error("Connection is already released");
        return await underlying.queryList<T>(sql, params);
      },
      async execute(sql: string, params?: any): Promise<number> {
        if (released) throw new Error("Connection is already released");
        return await underlying.execute(sql, params);
      },
      async close() {
        await this.release();
      }
    };
  }
}
