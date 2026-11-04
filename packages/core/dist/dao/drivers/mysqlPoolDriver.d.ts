import { Database } from "../database";
import { DbDialect } from "../dialect";
import { DbConnectionPool, PooledConnection, PoolConfig, PoolStatus } from "../pool";
export interface MySQLConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    client?: any;
}
export interface MySQLPoolConfig extends MySQLConfig {
    pool?: PoolConfig;
}
/**
 * テストおよび単体実行用のインメモリ MySQL ドライバー
 */
export declare class MySQLDriver implements Database {
    config: MySQLConfig;
    readonly dialect: DbDialect;
    inTransaction: boolean;
    private memoryStore;
    private queryLogs;
    constructor(config?: MySQLConfig);
    begin(): Promise<void>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;
    queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    execute(sql: string, params?: any): Promise<number>;
    close(): Promise<void>;
    setMemoryData(table: string, rows: any[]): void;
    getQueryLogs(): {
        sql: string;
        params?: any;
    }[];
}
/**
 * MySQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
export declare class MySQLPoolDriver implements Database, DbConnectionPool {
    config: MySQLPoolConfig;
    readonly dialect: DbDialect;
    private poolInstance;
    private activeTxConnection?;
    constructor(config?: MySQLPoolConfig);
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
//# sourceMappingURL=mysqlPoolDriver.d.ts.map