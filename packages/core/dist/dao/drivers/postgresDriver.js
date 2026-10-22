"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDriver = void 0;
const dialect_1 = require("../dialect");
/**
 * PostgreSQL 用プラガブル DB Driver
 */
class PostgresDriver {
    config;
    dialect = new dialect_1.PostgresDialect();
    inTransaction = false;
    client;
    memoryStore = new Map();
    queryLogs = [];
    constructor(config = {}) {
        this.config = config;
        this.client = config.client;
    }
    async begin() {
        await this.beginTransaction();
    }
    async beginTransaction() {
        if (this.client?.query) {
            await this.client.query("BEGIN");
        }
        this.inTransaction = true;
        this.queryLogs.push({ sql: "BEGIN" });
    }
    async commit() {
        if (!this.inTransaction)
            throw new Error("No transaction active to commit");
        if (this.client?.query) {
            await this.client.query("COMMIT");
        }
        this.inTransaction = false;
        this.queryLogs.push({ sql: "COMMIT" });
    }
    async rollback() {
        if (!this.inTransaction)
            throw new Error("No transaction active to rollback");
        if (this.client?.query) {
            await this.client.query("ROLLBACK");
        }
        this.inTransaction = false;
        this.queryLogs.push({ sql: "ROLLBACK" });
    }
    async queryOne(sql, params) {
        const list = await this.queryMany(sql, params);
        return list.length > 0 ? list[0] : null;
    }
    async queryMany(sql, params) {
        return this.queryList(sql, params);
    }
    async queryList(sql, params) {
        this.queryLogs.push({ sql, params });
        if (this.client?.query) {
            const res = await this.client.query(sql, params || []);
            return (res.rows || []);
        }
        // インメモリフォールバック
        const normalized = sql.toLowerCase();
        for (const [key, rows] of this.memoryStore.entries()) {
            if (normalized.includes(key.toLowerCase())) {
                return rows;
            }
        }
        return [];
    }
    async execute(sql, params) {
        this.queryLogs.push({ sql, params });
        if (this.client?.query) {
            const res = await this.client.query(sql, params || []);
            return res.rowCount ?? 1;
        }
        return 1;
    }
    async close() {
        if (this.client?.end) {
            await this.client.end();
        }
    }
    setMemoryData(table, rows) {
        this.memoryStore.set(table, rows);
    }
    getQueryLogs() {
        return [...this.queryLogs];
    }
}
exports.PostgresDriver = PostgresDriver;
//# sourceMappingURL=postgresDriver.js.map