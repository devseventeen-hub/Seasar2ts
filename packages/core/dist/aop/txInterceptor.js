"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxInterceptor = void 0;
/**
 * トランザクション境界を制御する Interceptor (Seasar2 の tx:requiredTx 等に相当)
 */
class TxInterceptor {
    db;
    constructor(db) {
        this.db = db;
    }
    async invoke(invocation) {
        await this.db.beginTransaction();
        try {
            const result = await invocation.proceed();
            await this.db.commit();
            return result;
        }
        catch (error) {
            await this.db.rollback();
            throw error;
        }
    }
}
exports.TxInterceptor = TxInterceptor;
//# sourceMappingURL=txInterceptor.js.map