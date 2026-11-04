import { Database } from "./database";
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
export declare function isConnectionPool(obj: any): obj is DbConnectionPool;
/**
 * 汎用コネクションプール実装基盤
 */
export declare class GenericConnectionPool implements DbConnectionPool {
    private connectionFactory;
    private connectionDestroyer?;
    readonly min: number;
    readonly max: number;
    readonly acquireTimeoutMillis: number;
    readonly idleTimeoutMillis: number;
    private idleList;
    private activeMap;
    private waitQueue;
    private connectionCounter;
    private isClosed;
    constructor(config: PoolConfig | undefined, connectionFactory: () => Promise<Database>, connectionDestroyer?: ((conn: Database) => Promise<void>) | undefined);
    acquire(): Promise<PooledConnection>;
    withConnection<T>(fn: (conn: PooledConnection) => Promise<T>): Promise<T>;
    releaseConnection(connId: string): Promise<void>;
    getStatus(): PoolStatus;
    close(): Promise<void>;
    private wrapConnection;
}
//# sourceMappingURL=pool.d.ts.map