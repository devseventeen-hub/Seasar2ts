"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDatabase = void 0;
const dialect_1 = require("./dialect");
/**
 * テスト・検証用のインメモリ MockDatabase 実装
 */
class MockDatabase {
    dialect;
    inTransaction = false;
    queryLogs = [];
    mockData = {};
    constructor(dialect = dialect_1.defaultDialect) {
        this.dialect = dialect;
    }
    async begin() {
        await this.beginTransaction();
    }
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
    async queryMany(sql, params) {
        return this.queryList(sql, params);
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