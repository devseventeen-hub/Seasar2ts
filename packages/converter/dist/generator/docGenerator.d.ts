import { SeasarClassIR } from "../ir/seasarIR";
export interface DocGeneratorOptions {
    title?: string;
    version?: string;
    description?: string;
}
/**
 * Seasar2 の Java 資産から型安全な API カタログ（Markdown）および OpenAPI/JSON スキーマを生成するジェネレータ
 */
export declare class DocGenerator {
    /**
     * 人間および AI 向け API & Type カタログ (Markdown) を出力する
     */
    generateApiCatalogMarkdown(classes: SeasarClassIR[], options?: DocGeneratorOptions): string;
    /**
     * OpenAPI 3.0 / JSON Schema 互換の構造化メタデータを生成する
     */
    generateApiSpecJson(classes: SeasarClassIR[], options?: DocGeneratorOptions): string;
    private mapTsTypeToJsonSchemaType;
}
//# sourceMappingURL=docGenerator.d.ts.map