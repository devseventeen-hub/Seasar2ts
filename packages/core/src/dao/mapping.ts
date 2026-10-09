/**
 * S2Dao 風 Bean ↔ ResultSet 自動マッピング
 */

/**
 * snake_case のキー文字列を camelCase に変換する
 */
export function snakeToCamel(str: string): string {
  return str.toLowerCase().replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
}

/**
 * データベースの行オブジェクト (レコード) を指定されたクラスのインスタンスにマッピングする
 * @param row DBレコード（カラム名と値のマップ）
 * @param Clazz マッピング先クラスコンストラクタ
 */
export function mapRowToBean<T>(row: Record<string, any> | null | undefined, Clazz: new () => T): T {
  const instance = new Clazz();
  if (!row) return instance;

  for (const [key, value] of Object.entries(row)) {
    // 1. そのままのキーで代入
    (instance as any)[key] = value;

    // 2. snake_case -> camelCase に変換したプロパティ名でも代入
    const camel = snakeToCamel(key);
    if (camel !== key) {
      (instance as any)[camel] = value;
    }

    // 3. プレフィックス除去 (user_name -> name, user_email -> email)
    const stripped = key.replace(/^[a-zA-Z0-9]+_/, "");
    if (stripped !== key) {
      (instance as any)[stripped] = value;
      (instance as any)[snakeToCamel(stripped)] = value;
    }
  }

  return instance;
}

/**
 * 複数のデータベース行を Bean インスタンス配列にマッピングする
 */
export function mapRowsToBeans<T>(rows: Record<string, any>[] | null | undefined, Clazz: new () => T): T[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((row) => mapRowToBean(row, Clazz));
}
