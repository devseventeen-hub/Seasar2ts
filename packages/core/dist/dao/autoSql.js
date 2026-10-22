"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSqlGenerator = void 0;
exports.camelToSnake = camelToSnake;
exports.inferTableName = inferTableName;
exports.executeAutoOrFileQuery = executeAutoOrFileQuery;
const dialect_1 = require("./dialect");
const loadSql_1 = require("./loadSql");
const mapping_1 = require("./mapping");
/**
 * キャメルケースの文字列をスネークケースに変換する
 */
function camelToSnake(str) {
    return str
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "");
}
/**
 * Dao クラス名または Entity クラス名からテーブル名を推定する
 * 例: UserDao -> users, ItemCategoryDao -> item_categories
 */
function inferTableName(className) {
    const baseName = className.replace(/(?:Dao|Repository|Entity|Bean)$/, "");
    const snake = camelToSnake(baseName);
    // 単純な複数形化 (s, x, z, ch, sh -> es, y -> ies, その他 -> s)
    if (snake.endsWith("s") || snake.endsWith("x") || snake.endsWith("ch") || snake.endsWith("sh")) {
        return `${snake}es`;
    }
    if (snake.endsWith("y") && !/[aeiou]y$/.test(snake)) {
        return `${snake.slice(0, -1)}ies`;
    }
    return `${snake}s`;
}
/**
 * S2Dao 規約ベースの自動 SQL ジェネレータ (DB 方言対応)
 */
class AutoSqlGenerator {
    /**
     * メソッド名と引数から自動生成 SQL を構築する
     * @param tableName 対象テーブル名
     * @param methodName メソッド名 (selectById, selectByExample, insert, etc.)
     * @param args メソッド実引数配列
     * @param dialect 適用する DB 方言 (デフォルトは SQLite / '?' プレースホルダー)
     */
    static generate(tableName, methodName, args = [], dialect = dialect_1.defaultDialect) {
        // 1. selectById / findById
        if (/^(?:select|find)ById$/i.test(methodName)) {
            const id = args[0];
            const ph = dialect.formatPlaceholder(1);
            return {
                sql: `SELECT * FROM ${tableName} WHERE id = ${ph};`,
                params: [id],
                type: "selectOne"
            };
        }
        // 2. selectAll / findAll
        if (/^(?:select|find)All$/i.test(methodName)) {
            return {
                sql: `SELECT * FROM ${tableName};`,
                params: [],
                type: "selectList"
            };
        }
        // 3. selectByExample / selectBy / findByExample
        if (/^(?:select|find)By(?:Example)?$/i.test(methodName)) {
            const condition = args[0] || {};
            const whereClauses = [];
            const params = [];
            let pIdx = 1;
            for (const [key, val] of Object.entries(condition)) {
                if (val !== undefined && val !== null) {
                    const colName = camelToSnake(key);
                    const ph = dialect.formatPlaceholder(pIdx++);
                    whereClauses.push(`${colName} = ${ph}`);
                    params.push(val);
                }
            }
            const wherePart = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";
            return {
                sql: `SELECT * FROM ${tableName}${wherePart};`,
                params,
                type: "selectList"
            };
        }
        // 4. insert
        if (/^insert/i.test(methodName)) {
            const entity = args[0] || {};
            const cols = [];
            const placeholders = [];
            const params = [];
            let pIdx = 1;
            for (const [key, val] of Object.entries(entity)) {
                if (val !== undefined) {
                    cols.push(camelToSnake(key));
                    placeholders.push(dialect.formatPlaceholder(pIdx++));
                    params.push(val);
                }
            }
            return {
                sql: `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")});`,
                params,
                type: "execute"
            };
        }
        // 5. update
        if (/^update/i.test(methodName)) {
            const entity = args[0] || {};
            const setClauses = [];
            const params = [];
            let idVal = undefined;
            let pIdx = 1;
            for (const [key, val] of Object.entries(entity)) {
                if (key.toLowerCase() === "id") {
                    idVal = val;
                }
                else if (val !== undefined) {
                    const ph = dialect.formatPlaceholder(pIdx++);
                    setClauses.push(`${camelToSnake(key)} = ${ph}`);
                    params.push(val);
                }
            }
            const idPh = dialect.formatPlaceholder(pIdx++);
            params.push(idVal);
            return {
                sql: `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = ${idPh};`,
                params,
                type: "execute"
            };
        }
        // 6. deleteById / delete
        if (/^delete(?:ById)?$/i.test(methodName)) {
            const arg = args[0];
            const id = typeof arg === "object" && arg !== null ? arg.id : arg;
            const ph = dialect.formatPlaceholder(1);
            return {
                sql: `DELETE FROM ${tableName} WHERE id = ${ph};`,
                params: [id],
                type: "execute"
            };
        }
        // フォールバック: 単純クエリ
        return {
            sql: `SELECT * FROM ${tableName};`,
            params: [],
            type: "selectList"
        };
    }
}
exports.AutoSqlGenerator = AutoSqlGenerator;
/**
 * SQL-first と自動クエリ生成のハイブリッド実行ヘルパー
 * SQLファイルが存在すればそれを実行し、存在しなければメソッド名規約からSQLを自動生成する
 */
async function executeAutoOrFileQuery(options) {
    const { db, daoName, methodName, sqlRelativePath, args, entityClass } = options;
    let sql;
    let params = args;
    let queryType = "selectOne";
    // 1. SQL ファイルが存在するか確認 (SQL-first 優先)
    if (sqlRelativePath) {
        try {
            sql = (0, loadSql_1.loadSql)(sqlRelativePath);
            // パラメータ置換 (シンプルな配列渡しまたは単一値)
            params = args.length === 1 ? args[0] : args;
        }
        catch {
            // 見つからなければ自動生成へフォールバック
            sql = undefined;
        }
    }
    // 2. SQL ファイルが無ければ規約から自動生成 (方言を db インスタンスから取得)
    if (!sql) {
        const tableName = inferTableName(daoName);
        const dialect = db.dialect || dialect_1.defaultDialect;
        const gen = AutoSqlGenerator.generate(tableName, methodName, args, dialect);
        sql = gen.sql;
        params = gen.params;
        queryType = gen.type;
    }
    else {
        // SQL ファイルからの場合、戻り値の型判定
        if (/^(?:update|insert|delete)/i.test(methodName)) {
            queryType = "execute";
        }
        else if (/(?:All|List)$/i.test(methodName)) {
            queryType = "selectList";
        }
        else {
            queryType = "selectOne";
        }
    }
    // 3. DB 実行と Bean マッピング
    if (queryType === "execute") {
        return await db.execute(sql, params);
    }
    else if (queryType === "selectList") {
        const rows = await db.queryList(sql, params);
        if (entityClass) {
            return (0, mapping_1.mapRowsToBeans)(rows, entityClass);
        }
        return rows;
    }
    else {
        const row = await db.queryOne(sql, params);
        if (entityClass && row) {
            return (0, mapping_1.mapRowToBean)(row, entityClass);
        }
        return row;
    }
}
//# sourceMappingURL=autoSql.js.map