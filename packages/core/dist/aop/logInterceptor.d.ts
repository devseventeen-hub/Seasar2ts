import { Interceptor, MethodInvocation } from "./interceptor";
export interface LogInterceptorOptions {
    logger?: (msg: string) => void;
}
/**
 * メソッド呼び出しの引数、戻り値、所要時間を記録する Interceptor
 */
export declare class LogInterceptor implements Interceptor {
    private log;
    constructor(options?: LogInterceptorOptions);
    invoke(invocation: MethodInvocation): Promise<any>;
}
//# sourceMappingURL=logInterceptor.d.ts.map