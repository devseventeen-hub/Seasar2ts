/**
 * S2Dao 風 Bean ↔ ResultSet 自動マッピング
 */
/**
 * snake_case のキー文字列を camelCase に変換する
 */
export declare function snakeToCamel(str: string): string;
/**
 * データベースの行オブジェクト (レコード) を指定されたクラスのインスタンスにマッピングする
 * @param row DBレコード（カラム名と値のマップ）
 * @param Clazz マッピング先クラスコンストラクタ
 */
export declare function mapRowToBean<T>(row: Record<string, any> | null | undefined, Clazz: new () => T): T;
/**
 * 複数のデータベース行を Bean インスタンス配列にマッピングする
 */
export declare function mapRowsToBeans<T>(rows: Record<string, any>[] | null | undefined, Clazz: new () => T): T[];
//# sourceMappingURL=mapping.d.ts.map