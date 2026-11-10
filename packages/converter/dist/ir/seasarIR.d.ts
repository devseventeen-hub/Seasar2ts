/**
 * Seasar2 中間表現 (Intermediate Representation - IR)
 * Java ソースコードから抽出された Seasar2 の構造モデル
 */
export type ComponentLayer = "action" | "logic" | "dao" | "entity" | "form" | "dto" | "other";
export interface SeasarFieldIR {
    name: string;
    type: string;
    isBinding: boolean;
    visibility: "public" | "protected" | "private";
    docComment?: string;
}
export interface SeasarMethodIR {
    name: string;
    returnType: string;
    parameters: {
        name: string;
        type: string;
        docComment?: string;
    }[];
    sqlFile?: string;
    isTransactional?: boolean;
    annotations: string[];
    docComment?: string;
    httpMethod?: "GET" | "POST" | "ALL";
    routePath?: string;
}
export interface SeasarClassIR {
    packageName: string;
    className: string;
    isInterface: boolean;
    layer: ComponentLayer;
    annotations: string[];
    fields: SeasarFieldIR[];
    methods: SeasarMethodIR[];
    docComment?: string;
    sourceFilePath?: string;
}
export interface SeasarProjectIR {
    classes: SeasarClassIR[];
    diconFiles: string[];
    sqlFiles: string[];
}
//# sourceMappingURL=seasarIR.d.ts.map