export interface DiconComponent {
    name?: string;
    className?: string;
    aspects: string[];
    properties: {
        name: string;
        value?: string;
        componentName?: string;
    }[];
}
export interface DiconInclude {
    path: string;
}
export interface DiconDefinition {
    filePath: string;
    includes: DiconInclude[];
    components: DiconComponent[];
}
/**
 * Seasar2 の .dicon (XML) ファイルをパースして構造化データを抽出する
 */
export declare function parseDiconFile(filePath: string): DiconDefinition;
/**
 * dicon XML 文字列をパースする
 */
export declare function parseDiconContent(xmlContent: string, filePath?: string): DiconDefinition;
export interface DiconDataSourceConfig {
    dbType: "postgresql" | "sqlite" | "mysql" | "unknown";
    driverClassName?: string;
    url?: string;
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
}
/**
 * JDBC URL から接続情報をパースする
 */
export declare function parseJdbcUrl(url: string): Partial<DiconDataSourceConfig>;
/**
 * DiconDefinition から dataSource コンポーネントの設定を抽出する
 */
export declare function extractDataSourceConfig(dicon: DiconDefinition): DiconDataSourceConfig | undefined;
//# sourceMappingURL=diconParser.d.ts.map