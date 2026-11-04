"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxInterceptor = void 0;
exports.getCurrentTxConnection = getCurrentTxConnection;
exports.createTransactionalDatabase = createTransactionalDatabase;
const async_hooks_1 = require("async_hooks");
const pool_1 = require("../dao/pool");
const txLocalStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * 現在アクティブなトランザクション接続を取得する
 */
function getCurrentTxConnection() {
    return txLocalStorage.getStore();
}
/**
 * トランザクション対応の Database プロキシを生成する
 * トランザクション実行中はリースされた接続へ、それ以外は元 db へ自動ルーティング
 */
function createTransactionalDatabase(db) {
    return new Proxy(db, {
        get(target, prop, receiver) {
            const activeConn = getCurrentTxConnection();
            const delegate = activeConn || target;
            const orig = Reflect.get(delegate, prop, receiver);
            if (typeof orig === "function") {
                return orig.bind(delegate);
            }
            return orig;
        }
    });
}
/**
 * トランザクション境界を制御する Interceptor (Seasar2 の tx:requiredTx 等に相当)
 * 接続プール (DbConnectionPool) との統合により、トランザクション開始時に接続を1つリースし、
 * コミット/ロールバック完了時に確実に返却（リーク完全防止）
 */
class TxInterceptor {
    db;
    constructor(db) {
        this.db = db;
    }
    async invoke(invocation) {
        if ((0, pool_1.isConnectionPool)(this.db)) {
            const pool = this.db;
            const conn = await pool.acquire();
            try {
                await conn.beginTransaction();
                const result = await txLocalStorage.run(conn, async () => {
                    return await invocation.proceed();
                });
                await conn.commit();
                return result;
            }
            catch (error) {
                try {
                    await conn.rollback();
                }
                catch {
                    // ロールバックエラーは握りつぶし、元エラーを優先
                }
                throw error;
            }
            finally {
                if (!conn.isReleased) {
                    await conn.release();
                }
            }
        }
        else {
            const database = this.db;
            await database.beginTransaction();
            try {
                const result = await txLocalStorage.run(database, async () => {
                    return await invocation.proceed();
                });
                await database.commit();
                return result;
            }
            catch (error) {
                try {
                    await database.rollback();
                }
                catch { }
                throw error;
            }
        }
    }
}
exports.TxInterceptor = TxInterceptor;
//# sourceMappingURL=txInterceptor.js.map