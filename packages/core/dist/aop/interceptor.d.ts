/**
 * AOP (Aspect-Oriented Programming) 基盤
 * Seasar2 の MethodInterceptor と同型のインターフェースおよび Proxy ベースの AOP 実装を提供
 */
export interface MethodInvocation {
    /** ターゲットオブジェクト */
    target: any;
    /** 呼び出されたメソッド名 */
    method: string | symbol;
    /** 引数リスト */
    args: any[];
    /** 次のインターセプターまたは本来のメソッドを実行する */
    proceed(): any | Promise<any>;
}
export interface Interceptor {
    /**
     * メソッド呼び出しをインターセプトする
     * @param invocation メソッド呼び出しコンテキスト
     */
    invoke(invocation: MethodInvocation): any | Promise<any>;
}
/**
 * ターゲットオブジェクトにインターセプター群を適用した Proxy を生成する
 * @param target 対象インスタンス
 * @param interceptors 適用するインターセプターの配列 (指定順に外側からラップ)
 */
export declare function applyInterceptors<T extends object>(target: T, interceptors: Interceptor[]): T;
//# sourceMappingURL=interceptor.d.ts.map