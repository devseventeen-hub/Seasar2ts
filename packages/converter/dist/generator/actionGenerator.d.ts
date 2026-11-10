import { SeasarClassIR } from "../ir/seasarIR";
/**
 * Seasar2 SA-Struts の Action クラスを TypeScript に変換するコードジェネレータ
 */
export declare class ActionTsGenerator {
    /**
     * Action クラスの TypeScript ソースコードを生成する
     */
    generateActionCode(ir: SeasarClassIR): string;
    /**
     * ActionForm / DTO クラスの TypeScript ソースコードを生成する
     */
    generateFormCode(ir: SeasarClassIR): string;
}
//# sourceMappingURL=actionGenerator.d.ts.map