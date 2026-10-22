import { DbDialect, defaultDialect } from "./dialect";

/**
 * 基本的なデータベース接続およびトランザクション・クエリ実行インターフェース
 */
export interface DbConnection {
  /** トランザクションを開始する */
  begin(): Promise<void>;
  /** トランザクションをコミットする */
  commit(): Promise<void>;
  /** トランザクションをロールバックする */
  rollback(): Promise<void>;

  /**
   * 単一行クエリを実行する
   * @param sql 実行するSQL文字列
   * @param params バインドパラメータ
   */
  queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null>;

  /**
   * 複数行クエリを実行する
   * @param sql 実行するSQL文字列
   * @param params バインドパラメータ
   */
  queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;

  /**
   * 更新/挿入/削除クエリを実行し、影響を受けた行数を返す
   * @param sql 実行するSQL文字列
   * @param params バインドパラメータ
   */
  execute(sql: string, params?: any): Promise<number>;

  /** 適用中の方言情報 */
  readonly dialect: DbDialect;
}

/**
 * データベース接続およびトランザクション境界の統合インターフェース
 * 既存コードとの後方互換性を維持しつつ DbConnection を充足
 */
export interface Database extends DbConnection {
  /** トランザクションを開始する (begin のエイリアス) */
  beginTransaction(): Promise<void>;

  /** 複数行クエリを実行する (queryMany のエイリアス) */
  queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]>;

  /** 接続の終了・後処理 (オプション) */
  close?(): Promise<void>;
}

/**
 * テスト・検証用のインメモリ MockDatabase 実装
 */
export class MockDatabase implements Database {
  public dialect: DbDialect;
  public inTransaction = false;
  public queryLogs: { sql: string; params?: any }[] = [];
  public mockData: Record<string, any[]> = {};

  constructor(dialect: DbDialect = defaultDialect) {
    this.dialect = dialect;
  }

  async begin(): Promise<void> {
    await this.beginTransaction();
  }

  async beginTransaction(): Promise<void> {
    this.inTransaction = true;
    this.queryLogs.push({ sql: "BEGIN TRANSACTION" });
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to commit");
    this.inTransaction = false;
    this.queryLogs.push({ sql: "COMMIT" });
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error("No transaction active to rollback");
    this.inTransaction = false;
    this.queryLogs.push({ sql: "ROLLBACK" });
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: any): Promise<T | null> {
    this.queryLogs.push({ sql, params });
    const list = await this.queryList<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async queryMany<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    return this.queryList<T>(sql, params);
  }

  async queryList<T = Record<string, any>>(sql: string, params?: any): Promise<T[]> {
    this.queryLogs.push({ sql, params });
    const normalizedSql = sql.toLowerCase();

    for (const [key, rows] of Object.entries(this.mockData)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedSql.includes(normalizedKey) || normalizedKey.includes(normalizedSql)) {
        return rows as T[];
      }
    }
    return [];
  }

  async execute(sql: string, params?: any): Promise<number> {
    this.queryLogs.push({ sql, params });
    return 1;
  }
}
