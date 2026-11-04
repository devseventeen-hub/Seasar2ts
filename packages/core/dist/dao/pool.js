"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericConnectionPool = void 0;
exports.isConnectionPool = isConnectionPool;
function isConnectionPool(obj) {
    return obj != null && typeof obj.acquire === "function" && typeof obj.withConnection === "function";
}
/**
 * 汎用コネクションプール実装基盤
 */
class GenericConnectionPool {
    connectionFactory;
    connectionDestroyer;
    min;
    max;
    acquireTimeoutMillis;
    idleTimeoutMillis;
    idleList = [];
    activeMap = new Map();
    waitQueue = [];
    connectionCounter = 0;
    isClosed = false;
    constructor(config = {}, connectionFactory, connectionDestroyer) {
        this.connectionFactory = connectionFactory;
        this.connectionDestroyer = connectionDestroyer;
        this.min = config.min ?? 1;
        this.max = config.max ?? 10;
        this.acquireTimeoutMillis = config.acquireTimeoutMillis ?? 10000;
        this.idleTimeoutMillis = config.idleTimeoutMillis ?? 30000;
    }
    async acquire() {
        if (this.isClosed) {
            throw new Error("Cannot acquire connection from a closed pool");
        }
        // 1. Check idle list
        while (this.idleList.length > 0) {
            const holder = this.idleList.pop();
            // Optional idle timeout check
            this.activeMap.set(holder.id, holder);
            return this.wrapConnection(holder);
        }
        // 2. Can create a new connection?
        if (this.activeMap.size < this.max) {
            const id = `conn_${++this.connectionCounter}`;
            const conn = await this.connectionFactory();
            const holder = { id, conn, lastUsed: Date.now() };
            this.activeMap.set(id, holder);
            return this.wrapConnection(holder);
        }
        // 3. Pool is saturated, queue waiter
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this.waitQueue.findIndex(w => w.timer === timer);
                if (idx !== -1) {
                    this.waitQueue.splice(idx, 1);
                }
                reject(new Error(`Connection acquisition timed out after ${this.acquireTimeoutMillis}ms (pool exhausted)`));
            }, this.acquireTimeoutMillis);
            this.waitQueue.push({ resolve, reject, timer });
        });
    }
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
    }
    async releaseConnection(connId) {
        const holder = this.activeMap.get(connId);
        if (!holder)
            return; // already released
        this.activeMap.delete(connId);
        if (this.isClosed) {
            if (this.connectionDestroyer) {
                await this.connectionDestroyer(holder.conn);
            }
            return;
        }
        holder.lastUsed = Date.now();
        // Check waiters
        if (this.waitQueue.length > 0) {
            const waiter = this.waitQueue.shift();
            clearTimeout(waiter.timer);
            this.activeMap.set(holder.id, holder);
            waiter.resolve(this.wrapConnection(holder));
            return;
        }
        // Return to idle list
        this.idleList.push(holder);
    }
    getStatus() {
        return {
            total: this.activeMap.size + this.idleList.length,
            active: this.activeMap.size,
            idle: this.idleList.length,
            waiting: this.waitQueue.length
        };
    }
    async close() {
        this.isClosed = true;
        // Reject all waiters
        while (this.waitQueue.length > 0) {
            const waiter = this.waitQueue.shift();
            clearTimeout(waiter.timer);
            waiter.reject(new Error("Pool is closing"));
        }
        // Destroy idle connections
        const destroyPromises = [];
        for (const h of this.idleList) {
            if (this.connectionDestroyer) {
                destroyPromises.push(this.connectionDestroyer(h.conn));
            }
            else if (h.conn.close) {
                destroyPromises.push(h.conn.close());
            }
        }
        this.idleList = [];
        // Destroy active connections
        for (const h of this.activeMap.values()) {
            if (this.connectionDestroyer) {
                destroyPromises.push(this.connectionDestroyer(h.conn));
            }
            else if (h.conn.close) {
                destroyPromises.push(h.conn.close());
            }
        }
        this.activeMap.clear();
        await Promise.all(destroyPromises);
    }
    wrapConnection(holder) {
        let released = false;
        const pool = this;
        const underlying = holder.conn;
        return {
            get connectionId() {
                return holder.id;
            },
            get isReleased() {
                return released;
            },
            get dialect() {
                return underlying.dialect;
            },
            async release() {
                if (released)
                    return;
                released = true;
                await pool.releaseConnection(holder.id);
            },
            async begin() {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.begin();
            },
            async beginTransaction() {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.beginTransaction();
            },
            async commit() {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.commit();
            },
            async rollback() {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.rollback();
            },
            async queryOne(sql, params) {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.queryOne(sql, params);
            },
            async queryMany(sql, params) {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.queryMany(sql, params);
            },
            async queryList(sql, params) {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.queryList(sql, params);
            },
            async execute(sql, params) {
                if (released)
                    throw new Error("Connection is already released");
                return await underlying.execute(sql, params);
            },
            async close() {
                await this.release();
            }
        };
    }
}
exports.GenericConnectionPool = GenericConnectionPool;
//# sourceMappingURL=pool.js.map