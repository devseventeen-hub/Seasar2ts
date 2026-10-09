/**
 * SQLファイルを探索するベースディレクトリを設定する
 */
export declare function setSqlBaseDir(dir: string): void;
/**
 * SQLファイルを読み込み、文字列として返す (キャッシュ付き)
 * @param relativePath SQLファイルの相対パス (例: "user/find.sql" や "sql/user/find.sql")
 */
export declare function loadSql(relativePath: string): string;
/**
 * テスト用キャッシュクリア
 */
export declare function clearSqlCache(): void;
//# sourceMappingURL=loadSql.d.ts.map