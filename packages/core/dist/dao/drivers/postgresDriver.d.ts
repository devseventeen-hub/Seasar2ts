import { Database } from "../database";
import { DbDialect } from "../dialect";
export interface PostgresConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean | any;
    client?: any;
}
/**
 * PostgreSQL 用プラガブル DB Driver
 */
export declare class PostgresDriver implements Database {
    config: PostgresConfig;
    readonly dialect: DbDialect;
    inTransaction: boolean;
    private client?;
    private memoryStore;
    private queryLogs;
    constructor(config?: PostgresConfig);
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
//# sourceMappingURL=postgresDriver.d.ts.map