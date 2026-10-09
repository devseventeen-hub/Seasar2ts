/**
 * データベース接続およびトランザクション境界の抽象インターフェース
 */
export interface Database {
    /** トランザクションを開始する */
    beginTransaction(): Promise<void>;
    /** トランザクションをコミットする */
    commit(): Promise<void>;
    /** トランザクションをロールバックする */
    rollback(): Promise<void>;
    /**
     * 単一行クエリを実行する
     * @param sql 実行するSQL文字列
     * @param params バインドパラメータ
     */
    queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;
    /**
     * 複数行クエリを実行する
     * @param sql 実行するSQL文字列
     * @param params バインドパラメータ
     */
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    /**
     * 更新/挿入/削除クエリを実行し、影響を受けた行数を返す
     * @param sql 実行するSQL文字列
     * @param params バインドパラメータ
     */
    execute(sql: string, params?: any): Promise<number>;
}
/**
 * テスト・検証用のインメモリ MockDatabase 実装
 */
export declare class MockDatabase implements Database {
    inTransaction: boolean;
    queryLogs: {
        sql: string;
        params?: any;
    }[];
    mockData: Record<string, any[]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    execute(sql: string, params?: any): Promise<number>;
}
//# sourceMappingURL=database.d.ts.map