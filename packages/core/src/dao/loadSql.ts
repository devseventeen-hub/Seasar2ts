import * as fs from "fs";
import * as path from "path";

const sqlCache = new Map<string, string>();
let sqlBaseDir = process.cwd();

/**
 * SQLファイルを探索するベースディレクトリを設定する
 */
export function setSqlBaseDir(dir: string): void {
  sqlBaseDir = dir;
}

/**
 * SQLファイルを読み込み、文字列として返す (キャッシュ付き)
 * @param relativePath SQLファイルの相対パス (例: "user/find.sql" や "sql/user/find.sql")
 */
export function loadSql(relativePath: string): string {
  if (sqlCache.has(relativePath)) {
    return sqlCache.get(relativePath)!;
  }

  // 複数の探索候補（そのまま、または src/sql/ 配下）
  const candidates = [
    path.resolve(sqlBaseDir, relativePath),
    path.resolve(sqlBaseDir, "src/sql", relativePath),
    path.resolve(sqlBaseDir, "sql", relativePath)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, "utf-8").trim();
      sqlCache.set(relativePath, content);
      return content;
    }
  }

  throw new Error(`SQL file not found: ${relativePath}. Checked candidates: ${candidates.join(", ")}`);
}

/**
 * テスト用キャッシュクリア
 */
export function clearSqlCache(): void {
  sqlCache.clear();
}
