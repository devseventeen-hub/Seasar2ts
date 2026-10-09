/**
 * Seasar2 中間表現 (Intermediate Representation - IR)
 * Java ソースコードから抽出された Seasar2 の構造モデル
 */
export type ComponentLayer = "action" | "logic" | "dao" | "entity" | "other";
export interface SeasarFieldIR {
    name: string;
    type: string;
    isBinding: boolean;
    visibility: "public" | "protected" | "private";
}
export interface SeasarMethodIR {
    name: string;
    returnType: string;
    parameters: {
        name: string;
        type: string;
    }[];
    sqlFile?: string;
    isTransactional?: boolean;
    annotations: string[];
}
export interface SeasarClassIR {
    packageName: string;
    className: string;
    isInterface: boolean;
    layer: ComponentLayer;
    annotations: string[];
    fields: SeasarFieldIR[];
    methods: SeasarMethodIR[];
    sourceFilePath?: string;
}
export interface SeasarProjectIR {
    classes: SeasarClassIR[];
    diconFiles: string[];
    sqlFiles: string[];
}
//# sourceMappingURL=seasarIR.d.ts.map