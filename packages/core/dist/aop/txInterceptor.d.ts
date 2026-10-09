import { Interceptor, MethodInvocation } from "./interceptor";
import { Database } from "../dao/database";
/**
 * トランザクション境界を制御する Interceptor (Seasar2 の tx:requiredTx 等に相当)
 */
export declare class TxInterceptor implements Interceptor {
    private db;
    constructor(db: Database);
    invoke(invocation: MethodInvocation): Promise<any>;
}
//# sourceMappingURL=txInterceptor.d.ts.map