import { DbDialect } from "./dialect";
/**
 * 基本的なデータベース接続およびトランザクション・クエリ実行インターフェース
 */
export interface DbConnection {
    /** トランザクションを開始する */
    begin(): Promise<void>;
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
    queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    /**
     * 更新/挿入/削除クエリを実行し、影響を受けた行数を返す
     * @param sql 実行するSQL文字列
     * @param params バインドパラメータ
     */
    execute(sql: string, params?: any): Promise<number>;
    /** 適用中の方言情報 */
    readonly dialect: DbDialect;
}
/**
 * データベース接続およびトランザクション境界の統合インターフェース
 * 既存コードとの後方互換性を維持しつつ DbConnection を充足
 */
export interface Database extends DbConnection {
    /** トランザクションを開始する (begin のエイリアス) */
    beginTransaction(): Promise<void>;
    /** 複数行クエリを実行する (queryMany のエイリアス) */
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    /** 接続の終了・後処理 (オプション) */
    close?(): Promise<void>;
}
/**
 * テスト・検証用のインメモリ MockDatabase 実装
 */
export declare class MockDatabase implements Database {
    dialect: DbDialect;
    inTransaction: boolean;
    queryLogs: {
        sql: string;
        params?: any;
    }[];
    mockData: Record<string, any[]>;
    constructor(dialect?: DbDialect);
    begin(): Promise<void>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;
    queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;
    execute(sql: string, params?: any): Promise<number>;
}
//# sourceMappingURL=database.d.ts.map