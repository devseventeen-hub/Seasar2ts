import * as fs from "fs";
import * as path from "path";
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
export function autoBind(container: Container, options: AutoBindOptions): string[] {
  const { baseDir, scope = "Singleton", recursive = true } = options;
  const boundNames: string[] = [];

  if (!fs.existsSync(baseDir)) {
    return boundNames;
  }

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory() && recursive) {
        scan(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
        !entry.name.endsWith(".d.ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        try {
          const mod = require(path.resolve(fullPath));

          for (const key of Object.keys(mod)) {
            const target = mod[key];

            // クラス (関数かつprototypeを持つもの) を対象とする
            if (typeof target === "function" && target.prototype && target.name) {
              const componentName = key;

              // 文字列トークンでの登録
              if (!container.isBound(componentName)) {
                const binding = container.bind(componentName).to(target);
                if (scope === "Singleton") binding.inSingletonScope();
                else if (scope === "Transient") binding.inTransientScope();
                boundNames.push(componentName);
              }

              // クラス自身での登録
              if (!container.isBound(target)) {
                const binding = container.bind(target).to(target);
                if (scope === "Singleton") binding.inSingletonScope();
                else if (scope === "Transient") binding.inTransientScope();
              }
            }
          }
        } catch (e) {
          // モジュールロードエラー時のログ
          console.warn(`[autoBind] Failed to load module ${fullPath}:`, e);
        }
      }
    }
  }

  scan(baseDir);
  return boundNames;
}
