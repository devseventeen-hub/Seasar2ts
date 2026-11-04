import { S2HierarchicalContainer } from "../container/hierarchicalContainer";
/**
 * ランタイム時に XML (.dicon) から直接 S2HierarchicalContainer を動的に構築するローダー
 */
export declare class DiconLoader {
    private rootContainer;
    private classRegistry;
    constructor(rootContainer?: S2HierarchicalContainer);
    /**
     * クラスコンストラクタを登録する
     */
    registerClass(name: string, ctor: any): this;
    /**
     * 複数のクラスコンストラクタを一括登録する
     */
    registerClasses(classes: Record<string, any>): this;
    /**
     * ルートコンテナを取得する
     */
    getContainer(): S2HierarchicalContainer;
    /**
     * .dicon ファイルからコンテナツリーを構築する
     */
    load(diconPath: string): S2HierarchicalContainer;
    /**
     * XML 文字列から動的にコンテナを構築する
     */
    loadContent(xmlContent: string, baseDir?: string, filePath?: string): S2HierarchicalContainer;
    private configureContainer;
    private bindComponent;
    private resolveClass;
    private resolveArg;
    private resolveProp;
    private parseValue;
}
//# sourceMappingURL=diconLoader.d.ts.map