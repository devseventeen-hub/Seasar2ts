import { Database } from "../database";
import { DbDialect } from "../dialect";
export interface SQLiteConfig {
    filename?: string;
    client?: any;
}
/**
 * SQLite 用プラガブル DB Driver
 */
export declare class SQLiteDriver implements Database {
    config: SQLiteConfig;
    readonly dialect: DbDialect;
    inTransaction: boolean;
    private client?;
    private memoryStore;
    private queryLogs;
    constructor(config?: SQLiteConfig);
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
//# sourceMappingURL=sqliteDriver.d.ts.map