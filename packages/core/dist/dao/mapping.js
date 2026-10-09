"use strict";
/**
 * S2Dao 風 Bean ↔ ResultSet 自動マッピング
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.snakeToCamel = snakeToCamel;
exports.mapRowToBean = mapRowToBean;
exports.mapRowsToBeans = mapRowsToBeans;
/**
 * snake_case のキー文字列を camelCase に変換する
 */
function snakeToCamel(str) {
    return str.toLowerCase().replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
}
/**
 * データベースの行オブジェクト (レコード) を指定されたクラスのインスタンスにマッピングする
 * @param row DBレコード（カラム名と値のマップ）
 * @param Clazz マッピング先クラスコンストラクタ
 */
function mapRowToBean(row, Clazz) {
    const instance = new Clazz();
    if (!row)
        return instance;
    for (const [key, value] of Object.entries(row)) {
        // 1. そのままのキーで代入
        instance[key] = value;
        // 2. snake_case -> camelCase に変換したプロパティ名でも代入
        const camel = snakeToCamel(key);
        if (camel !== key) {
            instance[camel] = value;
        }
        // 3. プレフィックス除去 (user_name -> name, user_email -> email)
        const stripped = key.replace(/^[a-zA-Z0-9]+_/, "");
        if (stripped !== key) {
            instance[stripped] = value;
            instance[snakeToCamel(stripped)] = value;
        }
    }
    return instance;
}
/**
 * 複数のデータベース行を Bean インスタンス配列にマッピングする
 */
function mapRowsToBeans(rows, Clazz) {
    if (!rows || !Array.isArray(rows))
        return [];
    return rows.map((row) => mapRowToBean(row, Clazz));
}
//# sourceMappingURL=mapping.js.map