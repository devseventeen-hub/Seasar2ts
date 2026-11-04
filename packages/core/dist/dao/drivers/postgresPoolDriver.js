"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresPoolDriver = void 0;
const dialect_1 = require("../dialect");
const pool_1 = require("../pool");
const postgresDriver_1 = require("./postgresDriver");
/**
 * PostgreSQL 用接続プールドライバー
 * Database および DbConnectionPool インターフェースを実装
 */
class PostgresPoolDriver {
    config;
    dialect = new dialect_1.PostgresDialect();
    poolInstance;
    activeTxConnection;
    constructor(config = {}) {
        this.config = config;
        if (config.client && typeof config.client.connect === "function") {
            // Native pg.Pool wrapper
            const pgPool = config.client;
            let connCounter = 0;
            this.poolInstance = {
                async acquire() {
                    const client = await pgPool.connect();
                    const connId = `pg_conn_${++connCounter}`;
                    let released = false;
                    const pooledConn = {
                        connectionId: connId,
                        get isReleased() {
                            return released;
                        },
                        dialect: new dialect_1.PostgresDialect(),
                        async release() {
                            if (released)
                                return;
                            released = true;
                            client.release();
                        },
                        async begin() {
                            await client.query("BEGIN");
                        },
                        async beginTransaction() {
                            await client.query("BEGIN");
                        },
                        async commit() {
                            await client.query("COMMIT");
                        },
                        async rollback() {
                            await client.query("ROLLBACK");
                        },
                        async queryOne(sql, params) {
                            const list = await this.queryList(sql, params);
                            return list.length > 0 ? list[0] : null;
                        },
                        async queryMany(sql, params) {
                            return this.queryList(sql, params);
                        },
                        async queryList(sql, params) {
                            const res = await client.query(sql, params || []);
                            return (res.rows || []);
                        },
                        async execute(sql, params) {
                            const res = await client.query(sql, params || []);
                            return res.rowCount ?? 1;
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
                    if (pgPool.end) {
                        await pgPool.end();
                    }
                },
                getStatus() {
                    const total = pgPool.totalCount ?? 0;
                    const idle = pgPool.idleCount ?? 0;
                    return {
                        total,
                        active: total - idle,
                        idle,
                        waiting: pgPool.waitingCount ?? 0
                    };
                }
            };
        }
        else {
            // In-memory or standalone GenericConnectionPool
            this.poolInstance = new pool_1.GenericConnectionPool(config.pool, async () => new postgresDriver_1.PostgresDriver(config));
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
exports.PostgresPoolDriver = PostgresPoolDriver;
//# sourceMappingURL=postgresPoolDriver.js.map