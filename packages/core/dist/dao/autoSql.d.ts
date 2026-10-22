import { Database } from "./database";
import { DbDialect } from "./dialect";
/**
 * キャメルケースの文字列をスネークケースに変換する
 */
export declare function camelToSnake(str: string): string;
/**
 * Dao クラス名または Entity クラス名からテーブル名を推定する
 * 例: UserDao -> users, ItemCategoryDao -> item_categories
 */
export declare function inferTableName(className: string): string;
export interface GeneratedSql {
    sql: string;
    params: any[];
    type: "selectOne" | "selectList" | "execute";
}
/**
 * S2Dao 規約ベースの自動 SQL ジェネレータ (DB 方言対応)
 */
export declare class AutoSqlGenerator {
    /**
     * メソッド名と引数から自動生成 SQL を構築する
     * @param tableName 対象テーブル名
     * @param methodName メソッド名 (selectById, selectByExample, insert, etc.)
     * @param args メソッド実引数配列
     * @param dialect 適用する DB 方言 (デフォルトは SQLite / '?' プレースホルダー)
     */
    static generate(tableName: string, methodName: string, args?: any[], dialect?: DbDialect): GeneratedSql;
}
export interface AutoOrFileQueryOptions<T = any> {
    db: Database;
    daoName: string;
    methodName: string;
    sqlRelativePath?: string;
    args: any[];
    entityClass?: new () => T;
}
/**
 * SQL-first と自動クエリ生成のハイブリッド実行ヘルパー
 * SQLファイルが存在すればそれを実行し、存在しなければメソッド名規約からSQLを自動生成する
 */
export declare function executeAutoOrFileQuery<T = any>(options: AutoOrFileQueryOptions<T>): Promise<any>;
//# sourceMappingURL=autoSql.d.ts.map