import { Interceptor } from "./interceptor";
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
export declare function matchesPattern(pattern: string | RegExp | undefined, text: string): boolean;
/**
 * クラス名とメソッド名がポイントカットに合致するか判定する
 */
export declare function matchesPointcut(pointcut: Pointcut, className: string, methodName: string): boolean;
/**
 * 対象インスタンスに PointcutAdvisor 群を適用した選択的 Proxy を生成する
 * 呼び出されたメソッド名にマッチする Interceptor だけを動的に抽出してチェーン実行する
 */
export declare function applyPointcutAdvisors<T extends object>(target: T, className?: string, advisors?: PointcutAdvisor[]): T;
//# sourceMappingURL=pointcut.d.ts.map