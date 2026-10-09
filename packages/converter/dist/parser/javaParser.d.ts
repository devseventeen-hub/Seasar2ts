import { SeasarClassIR } from "../ir/seasarIR";
export interface ParseOptions {
    jarPath?: string;
}
/**
 * Java ソースコードから SeasarClassIR を抽出するパーサー
 * JavaParser CLI (JAR) が指定/存在する場合はそれを実行し、
 * なければ標準の精密正規表現/トークンアナライザーで構文解析を行う
 */
export declare class SeasarJavaParser {
    private jarPath?;
    constructor(options?: ParseOptions);
    /**
     * Java ファイル単体を解析して SeasarClassIR を返す
     */
    parseFile(filePath: string): SeasarClassIR;
    /**
     * Java ソースコード文字列を解析して SeasarClassIR を構築する
     */
    parseSource(source: string, filePath?: string): SeasarClassIR;
    /**
     * 内蔵アナライザーによる Java クラス・アノテーション・メソッドの抽出
     */
    private parseWithBuiltinAnalyzer;
    private determineLayer;
    private extractFields;
    private extractMethods;
}
//# sourceMappingURL=javaParser.d.ts.map