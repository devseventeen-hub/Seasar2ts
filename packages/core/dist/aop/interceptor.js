"use strict";
/**
 * AOP (Aspect-Oriented Programming) 基盤
 * Seasar2 の MethodInterceptor と同型のインターフェースおよび Proxy ベースの AOP 実装を提供
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyInterceptors = applyInterceptors;
/**
 * ターゲットオブジェクトにインターセプター群を適用した Proxy を生成する
 * @param target 対象インスタンス
 * @param interceptors 適用するインターセプターの配列 (指定順に外側からラップ)
 */
function applyInterceptors(target, interceptors) {
    if (!interceptors || interceptors.length === 0) {
        return target;
    }
    return new Proxy(target, {
        get(obj, prop, receiver) {
            const orig = Reflect.get(obj, prop, receiver);
            if (typeof orig !== "function") {
                return orig;
            }
            return function (...args) {
                let index = 0;
                const invocation = {
                    target: obj,
                    method: prop,
                    args,
                    proceed: () => {
                        if (index < interceptors.length) {
                            const currentInterceptor = interceptors[index++];
                            return currentInterceptor.invoke(invocation);
                        }
                        return orig.apply(obj, args);
                    }
                };
                return invocation.proceed();
            };
        }
    });
}
//# sourceMappingURL=interceptor.js.map