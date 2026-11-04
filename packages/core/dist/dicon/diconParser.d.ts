import { PoolConfig } from "../dao/pool";
export type { PoolConfig };
export interface DiconArg {
    index?: number;
    value?: string;
    componentName?: string;
    expression?: string;
}
export interface DiconProperty {
    name: string;
    value?: string;
    componentName?: string;
    expression?: string;
}
export interface DiconAspect {
    interceptorName: string;
    pointcut?: string;
}
export interface DiconMethodInvocation {
    methodName: string;
    args: DiconArg[];
}
export interface DiconMeta {
    name: string;
    value?: string;
}
export interface DiconComponentDefinition {
    name?: string;
    className?: string;
    instanceScope?: "singleton" | "prototype" | "request" | "session";
    autoBinding?: "auto" | "constructor" | "property" | "none";
    args: DiconArg[];
    properties: DiconProperty[];
    aspects: (DiconAspect | string)[];
    aspectDefs: DiconAspect[];
    initMethods: DiconMethodInvocation[];
    destroyMethods: DiconMethodInvocation[];
    metas: DiconMeta[];
}
export type DiconComponent = DiconComponentDefinition;
export interface DiconInclude {
    path: string;
}
export interface DiconDefinition {
    filePath: string;
    namespace?: string;
    includes: DiconInclude[];
    components: DiconComponentDefinition[];
    metas: DiconMeta[];
}
/**
 * 文字列の前後の引用符を剥がす
 */
export declare function unquote(str?: string): string | undefined;
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
    pool?: PoolConfig;
}
/**
 * JDBC URL から接続情報をパースする
 */
export declare function parseJdbcUrl(url: string): Partial<DiconDataSourceConfig>;
/**
 * DiconDefinition から dataSource コンポーネントの設定を抽出する (接続プール設定対応)
 */
export declare function extractDataSourceConfig(dicon: DiconDefinition): DiconDataSourceConfig | undefined;
//# sourceMappingURL=diconParser.d.ts.map