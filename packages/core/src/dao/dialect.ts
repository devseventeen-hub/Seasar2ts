/**
 * データベース方言 (Dialect) の抽象インターフェースおよび標準実装
 */

export interface DbDialect {
  readonly name: string;
  /** パラメータプレースホルダーの文字列を生成 (1-indexed: index=1 -> '?' または '$1') */
  formatPlaceholder(index: number): string;
  /** カラム名・テーブル名などの識別子をクォート処理 */
  quoteIdentifier(identifier: string): string;
}

/**
 * SQLite 用方言
 */
export class SQLiteDialect implements DbDialect {
  readonly name = "sqlite";

  formatPlaceholder(_index: number): string {
    return "?";
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

/**
 * PostgreSQL 用方言
 */
export class PostgresDialect implements DbDialect {
  readonly name = "postgresql";

  formatPlaceholder(index: number): string {
    return `$${index}`;
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

/**
 * MySQL / MariaDB 用方言 (将来拡張用)
 */
export class MySQLDialect implements DbDialect {
  readonly name = "mysql";

  formatPlaceholder(_index: number): string {
    return "?";
  }

  quoteIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, "``")}\``;
  }
}

export const defaultDialect: DbDialect = new SQLiteDialect();
