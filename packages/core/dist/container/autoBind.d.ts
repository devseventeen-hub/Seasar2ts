import { Container } from "inversify";
export interface AutoBindOptions {
    /** 探索対象ディレクトリ */
    baseDir: string;
    /** バインディングスコープ (デフォルト: Singleton) */
    scope?: "Singleton" | "Transient" | "Request";
    /** サブディレクトリを再帰的に走査するか (デフォルト: true) */
    recursive?: boolean;
}
/**
 * 指定ディレクトリ配下のクラスを走査し、クラス名トークンおよびクラス参照自身でコンテナに自動登録する
 * Seasar2 の「命名規約による自動バインディング」を実現
 */
export declare function autoBind(container: Container, options: AutoBindOptions): string[];
//# sourceMappingURL=autoBind.d.ts.map