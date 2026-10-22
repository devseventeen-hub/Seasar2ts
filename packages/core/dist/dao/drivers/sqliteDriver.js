"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDriver = void 0;
const dialect_1 = require("../dialect");
/**
 * SQLite 用プラガブル DB Driver
 */
class SQLiteDriver {
    config;
    dialect = new dialect_1.SQLiteDialect();
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
        if (this.client?.exec) {
            await this.client.exec("BEGIN TRANSACTION;");
        }
        this.inTransaction = true;
        this.queryLogs.push({ sql: "BEGIN TRANSACTION" });
    }
    async commit() {
        if (!this.inTransaction)
            throw new Error("No transaction active to commit");
        if (this.client?.exec) {
            await this.client.exec("COMMIT;");
        }
        this.inTransaction = false;
        this.queryLogs.push({ sql: "COMMIT" });
    }
    async rollback() {
        if (!this.inTransaction)
            throw new Error("No transaction active to rollback");
        if (this.client?.exec) {
            await this.client.exec("ROLLBACK;");
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
        if (this.client) {
            if (typeof this.client.all === "function") {
                return new Promise((resolve, reject) => {
                    this.client.all(sql, params || [], (err, rows) => {
                        if (err)
                            reject(err);
                        else
                            resolve(rows || []);
                    });
                });
            }
            if (typeof this.client.prepare === "function") {
                const stmt = this.client.prepare(sql);
                return (params ? stmt.all(...params) : stmt.all());
            }
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
        if (this.client) {
            if (typeof this.client.run === "function") {
                return new Promise((resolve, reject) => {
                    this.client.run(sql, params || [], function (err) {
                        if (err)
                            reject(err);
                        else
                            resolve(this?.changes ?? 1);
                    });
                });
            }
            if (typeof this.client.prepare === "function") {
                const stmt = this.client.prepare(sql);
                const info = params ? stmt.run(...params) : stmt.run();
                return info?.changes ?? 1;
            }
        }
        return 1;
    }
    async close() {
        if (this.client?.close) {
            if (typeof this.client.close === "function") {
                await this.client.close();
            }
        }
    }
    setMemoryData(table, rows) {
        this.memoryStore.set(table, rows);
    }
    getQueryLogs() {
        return [...this.queryLogs];
    }
}
exports.SQLiteDriver = SQLiteDriver;
//# sourceMappingURL=sqliteDriver.js.map