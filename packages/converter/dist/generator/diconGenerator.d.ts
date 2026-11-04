import { DiconDefinition } from "@seasar2ts/core";
export interface DiconGeneratorOptions {
    functionName?: string;
    importCorePath?: string;
    classImports?: Record<string, string>;
    declareMissingClasses?: boolean;
}
export declare class DiconTsGenerator {
    generate(dicon: DiconDefinition, options?: DiconGeneratorOptions): string;
    private generateComponentBinding;
}
//# sourceMappingURL=diconGenerator.d.ts.map