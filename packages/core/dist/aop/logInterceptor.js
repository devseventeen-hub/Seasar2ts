"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogInterceptor = void 0;
/**
 * メソッド呼び出しの引数、戻り値、所要時間を記録する Interceptor
 */
class LogInterceptor {
    log;
    constructor(options) {
        this.log = options?.logger || ((msg) => console.log(`[LogInterceptor] ${msg}`));
    }
    async invoke(invocation) {
        const methodName = String(invocation.method);
        const targetName = invocation.target?.constructor?.name || "Target";
        const startTime = Date.now();
        this.log(`BEGIN ${targetName}#${methodName} with args: ${JSON.stringify(invocation.args)}`);
        try {
            const result = await invocation.proceed();
            const elapsed = Date.now() - startTime;
            this.log(`END ${targetName}#${methodName} (${elapsed}ms) result: ${JSON.stringify(result)}`);
            return result;
        }
        catch (error) {
            const elapsed = Date.now() - startTime;
            this.log(`ERROR ${targetName}#${methodName} (${elapsed}ms) threw: ${error}`);
            throw error;
        }
    }
}
exports.LogInterceptor = LogInterceptor;
//# sourceMappingURL=logInterceptor.js.map