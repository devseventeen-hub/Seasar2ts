import { Interceptor, MethodInvocation } from "./interceptor";

/**
 * ポイントカット定義
 * 対象クラス名および対象メソッド名に対するパターンマッチングルール
 */
export interface Pointcut {
  /** クラス名パターン (正規表現またはワイルドカード 例: "*Logic", ".*Service") */
  classPattern?: string | RegExp;
  /** メソッド名パターン (正規表現またはワイルドカード 例: "get.*", "insert.*", ".*") */
  methodPattern?: string | RegExp;
}

/**
 * ポイントカットと Interceptor のペア（Advisor）
 */
export interface PointcutAdvisor {
  pointcut: Pointcut;
  interceptor: Interceptor;
}

/**
 * パターンマッチングヘルパー
 * 文字列パターン（ワイルドカード "*" を ".*" に置換）または正規表現でテストする
 */
export function matchesPattern(pattern: string | RegExp | undefined, text: string): boolean {
  if (!pattern) return true; // 未指定なら全マッチ

  if (pattern instanceof RegExp) {
    return pattern.test(text);
  }

  try {
    // 1. すでに正規表現として妥当ならそのまま正規表現として試す
    // 例: "get.*", "^[a-z]+$", ".*"
    if (pattern.includes(".*") || pattern.startsWith("^") || pattern.endsWith("$")) {
      const regex = new RegExp(pattern);
      return regex.test(text);
    }

    // 2. 単純なワイルドカード "get*" や "*Service" の場合
    if (pattern.includes("*")) {
      const regexStr = "^" + pattern.replace(/\*/g, ".*") + "$";
      const regex = new RegExp(regexStr);
      return regex.test(text);
    }

    // 3. 部分一致または完全一致
    return text === pattern || text.includes(pattern);
  } catch {
    return text.includes(pattern);
  }
}

/**
 * クラス名とメソッド名がポイントカットに合致するか判定する
 */
export function matchesPointcut(pointcut: Pointcut, className: string, methodName: string): boolean {
  const classMatch = matchesPattern(pointcut.classPattern, className);
  if (!classMatch) return false;

  const methodMatch = matchesPattern(pointcut.methodPattern, methodName);
  return methodMatch;
}

/**
 * 対象インスタンスに PointcutAdvisor 群を適用した選択的 Proxy を生成する
 * 呼び出されたメソッド名にマッチする Interceptor だけを動的に抽出してチェーン実行する
 */
export function applyPointcutAdvisors<T extends object>(
  target: T,
  className?: string,
  advisors: PointcutAdvisor[] = []
): T {
  if (!advisors || advisors.length === 0) {
    return target;
  }

  const resolvedClassName = className || target.constructor?.name || "Target";

  return new Proxy(target, {
    get(obj, prop, receiver) {
      const orig = Reflect.get(obj, prop, receiver);
      if (typeof orig !== "function") {
        return orig;
      }

      const methodName = String(prop);

      // 当該メソッドにマッチするインターセプターを抽出
      const matchedInterceptors: Interceptor[] = [];
      for (const advisor of advisors) {
        if (matchesPointcut(advisor.pointcut, resolvedClassName, methodName)) {
          matchedInterceptors.push(advisor.interceptor);
        }
      }

      // マッチするインターセプターが無ければオリジナルのまま実行
      if (matchedInterceptors.length === 0) {
        return orig.bind(obj);
      }

      return function (this: any, ...args: any[]) {
        let index = 0;

        const invocation: MethodInvocation = {
          target: obj,
          method: prop,
          args,
          proceed: () => {
            if (index < matchedInterceptors.length) {
              const current = matchedInterceptors[index++];
              return current.invoke(invocation);
            }
            return orig.apply(obj, args);
          }
        };

        return invocation.proceed();
      };
    }
  });
}
