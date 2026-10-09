"use strict";
/**
 * データベース接続およびトランザクション境界の抽象インターフェース
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDatabase = void 0;
/**
 * テスト・検証用のインメモリ MockDatabase 実装
 */
class MockDatabase {
    inTransaction = false;
    queryLogs = [];
    mockData = {};
    async beginTransaction() {
        this.inTransaction = true;
        this.queryLogs.push({ sql: "BEGIN TRANSACTION" });
    }
    async commit() {
        if (!this.inTransaction)
            throw new Error("No transaction active to commit");
        this.inTransaction = false;
        this.queryLogs.push({ sql: "COMMIT" });
    }
    async rollback() {
        if (!this.inTransaction)
            throw new Error("No transaction active to rollback");
        this.inTransaction = false;
        this.queryLogs.push({ sql: "ROLLBACK" });
    }
    async queryOne(sql, params) {
        this.queryLogs.push({ sql, params });
        const list = await this.queryList(sql, params);
        return list.length > 0 ? list[0] : null;
    }
    async queryList(sql, params) {
        this.queryLogs.push({ sql, params });
        const normalizedSql = sql.toLowerCase();
        for (const [key, rows] of Object.entries(this.mockData)) {
            const normalizedKey = key.toLowerCase();
            if (normalizedSql.includes(normalizedKey) || normalizedKey.includes(normalizedSql)) {
                return rows;
            }
        }
        return [];
    }
    async execute(sql, params) {
        this.queryLogs.push({ sql, params });
        return 1;
    }
}
exports.MockDatabase = MockDatabase;
//# sourceMappingURL=database.js.map