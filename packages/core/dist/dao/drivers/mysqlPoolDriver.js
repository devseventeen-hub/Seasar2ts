"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLPoolDriver = exports.MySQLDriver = void 0;
const dialect_1 = require("../dialect");
const pool_1 = require("../pool");
/**
 * テストおよび単体実行用のインメモリ MySQL ドライバー
 */
class MySQLDriver {
    config;
    dialect = new dialect_1.MySQLDialect();
    inTransaction = false;
    memoryStore = new Map();
    queryLogs = [];
    constructor(config = {}) {
        this.config = config;
    }
    async begin() {
        await this.beginTransaction();
    }
    async beginTransaction() {
        if (this.config.client?.query) {
            await this.config.client.query("START TRANSACTION");
        }
        this.inTransaction = true;
        this.queryLogs.push({ sql: "START TRANSACTION" });
    }
    async commit() {
        if (!this.inTransaction)
            throw new Error("No transaction active to commit");
        if (this.config.client?.query) {
            await this.config.client.query("COMMIT");
        }
        this.inTransaction = false;
        this.queryLogs.push({ sql: "COMMIT" });
    }
    async rollback() {
        if (!this.inTransaction)
            throw new Error("No transaction active to rollback");
        if (this.config.client?.query) {
            await this.config.client.query("ROLLBACK");
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
        if (this.config.client?.execute) {
            const [rows] = await this.config.client.execute(sql, params || []);
            return (rows || []);
        }
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
        if (this.config.client?.execute) {
            const [result] = await this.config.client.execute(sql, params || []);
            return result.affectedRows ?? 1;
        }
        return 1;
    }
    async close() {
        if (this.config.client?.end) {
            await this.config.client.end();
        }
    }
    setMemoryData(table, rows) {
        this.memoryStore.set(table, rows);
    }
    getQueryLogs() {
        return [...this.queryLogs];
    }
}
exports.MySQLDriver = MySQLDriver;
/**
 * MySQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
class MySQLPoolDriver {
    config;
    dialect = new dialect_1.MySQLDialect();
    poolInstance;
    activeTxConnection;
    constructor(config = {}) {
        this.config = config;
        if (config.client && typeof config.client.getConnection === "function") {
            // Native mysql2/promise pool wrapper
            const myPool = config.client;
            let connCounter = 0;
            this.poolInstance = {
                async acquire() {
                    const rawConn = await myPool.getConnection();
                    const connId = `mysql_conn_${++connCounter}`;
                    let released = false;
                    const pooledConn = {
                        connectionId: connId,
                        get isReleased() {
                            return released;
                        },
                        dialect: new dialect_1.MySQLDialect(),
                        async release() {
                            if (released)
                                return;
                            released = true;
                            rawConn.release();
                        },
                        async begin() {
                            await rawConn.query("START TRANSACTION");
                        },
                        async beginTransaction() {
                            await rawConn.query("START TRANSACTION");
                        },
                        async commit() {
                            await rawConn.query("COMMIT");
                        },
                        async rollback() {
                            await rawConn.query("ROLLBACK");
                        },
                        async queryOne(sql, params) {
                            const list = await this.queryList(sql, params);
                            return list.length > 0 ? list[0] : null;
                        },
                        async queryMany(sql, params) {
                            return this.queryList(sql, params);
                        },
                        async queryList(sql, params) {
                            const [rows] = await rawConn.execute(sql, params || []);
                            return (rows || []);
                        },
                        async execute(sql, params) {
                            const [result] = await rawConn.execute(sql, params || []);
                            return result.affectedRows ?? 1;
                        },
                        async close() {
                            await this.release();
                        }
                    };
                    return pooledConn;
                },
                async withConnection(fn) {
                    const conn = await this.acquire();
                    try {
                        return await fn(conn);
                    }
                    finally {
                        if (!conn.isReleased) {
                            await conn.release();
                        }
                    }
                },
                async close() {
                    if (myPool.end) {
                        await myPool.end();
                    }
                },
                getStatus() {
                    return {
                        total: 0,
                        active: 0,
                        idle: 0,
                        waiting: 0
                    };
                }
            };
        }
        else {
            // In-memory or standalone GenericConnectionPool
            this.poolInstance = new pool_1.GenericConnectionPool(config.pool, async () => new MySQLDriver(config));
        }
    }
    // DbConnectionPool methods
    acquire() {
        return this.poolInstance.acquire();
    }
    withConnection(fn) {
        return this.poolInstance.withConnection(fn);
    }
    getStatus() {
        return this.poolInstance.getStatus();
    }
    async close() {
        if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
            await this.activeTxConnection.release();
            this.activeTxConnection = undefined;
        }
        await this.poolInstance.close();
    }
    // Database / DbConnection methods
    async begin() {
        await this.beginTransaction();
    }
    async beginTransaction() {
        if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
            this.activeTxConnection = await this.acquire();
        }
        await this.activeTxConnection.beginTransaction();
    }
    async commit() {
        if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
            throw new Error("No transaction active to commit");
        }
        try {
            await this.activeTxConnection.commit();
        }
        finally {
            await this.activeTxConnection.release();
            this.activeTxConnection = undefined;
        }
    }
    async rollback() {
        if (!this.activeTxConnection || this.activeTxConnection.isReleased) {
            throw new Error("No transaction active to rollback");
        }
        try {
            await this.activeTxConnection.rollback();
        }
        finally {
            await this.activeTxConnection.release();
            this.activeTxConnection = undefined;
        }
    }
    async queryOne(sql, params) {
        if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
            return this.activeTxConnection.queryOne(sql, params);
        }
        return this.withConnection(conn => conn.queryOne(sql, params));
    }
    async queryMany(sql, params) {
        return this.queryList(sql, params);
    }
    async queryList(sql, params) {
        if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
            return this.activeTxConnection.queryList(sql, params);
        }
        return this.withConnection(conn => conn.queryList(sql, params));
    }
    async execute(sql, params) {
        if (this.activeTxConnection && !this.activeTxConnection.isReleased) {
            return this.activeTxConnection.execute(sql, params);
        }
        return this.withConnection(conn => conn.execute(sql, params));
    }
}
exports.MySQLPoolDriver = MySQLPoolDriver;
//# sourceMappingURL=mysqlPoolDriver.js.map