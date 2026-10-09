import { SeasarClassIR } from "../ir/seasarIR";
/**
 * Java の型名を TypeScript の型名に変換する
 */
export declare function mapJavaTypeToTs(javaType: string): string;
export declare function isBuiltinType(typeName: string): boolean;
/**
 * SeasarClassIR から TypeScript コードを生成するジェネレータ
 */
export declare class SeasarTsGenerator {
    /**
     * クラスIRの種類に応じて適切な TS コードを生成する
     */
    generateClassCode(ir: SeasarClassIR): string;
    /**
     * Entity / POJO Bean の TypeScript コード生成
     */
    generateEntityCode(ir: SeasarClassIR): string;
    /**
     * S2Dao (Interface / Class) の TypeScript 具象クラスコード生成
     */
    generateDaoCode(ir: SeasarClassIR): string;
    /**
     * Action / Logic クラスの TypeScript コード生成 (Constructor Injection 化)
     */
    generateServiceCode(ir: SeasarClassIR): string;
    /**
     * アプリケーション全体のコンテナ初期化スクリプト (container.ts) を生成する
     */
    generateContainerBootstrap(): string;
}
//# sourceMappingURL=tsGenerator.d.ts.map