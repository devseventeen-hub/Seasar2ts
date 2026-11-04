import { Database } from "../database";
import { DbDialect } from "../dialect";
import { DbConnectionPool, PooledConnection, PoolConfig, PoolStatus } from "../pool";
import { PostgresConfig } from "./postgresDriver";
export interface PostgresPoolConfig extends PostgresConfig {
    pool?: PoolConfig;
}
/**
 * PostgreSQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
export declare class PostgresPoolDriver implements Database, DbConnectionPool {
    config: PostgresPoolConfig;
    readonly dialect: DbDialect;
    private poolInstance;
    private activeTxConnection?;
    constructor(config?: PostgresPoolConfig);
    acquire(): Promise<PooledConnection>;
    withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T>;
    getStatus(): PoolStatus;
    close(): Promise<void>;
    begin(): Promise<void>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;
    queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    execute(sql: string, params?: any): Promise<number>;
}
//# sourceMappingURL=postgresPoolDriver.d.ts.map