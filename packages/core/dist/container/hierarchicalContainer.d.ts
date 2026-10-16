import "reflect-metadata";
import { Container, interfaces } from "inversify";
import { AutoBindOptions } from "./autoBind";
/**
 * Seasar2 の S2Container の入れ子構造（階層コンテナ）を再現するクラス
 * 親コンテナのコンポーネント（Database, 共通Dao/Service）を子が透過的に継承しつつ、
 * 子コンテナ（Webコンテナ、Batchコンテナ等）独自のバインディングやInterceptorを分離管理する
 */
export declare class S2HierarchicalContainer {
    private container;
    private parentContainer?;
    private children;
    readonly name: string;
    constructor(name?: string, options?: interfaces.ContainerOptions, parent?: S2HierarchicalContainer);
    /**
     * 内部の InversifyJS Container を取得
     */
    getRawContainer(): Container;
    /**
     * 親コンテナを取得
     */
    getParent(): S2HierarchicalContainer | undefined;
    /**
     * 子コンテナを生成して階層ツリーに追加する
     * @param name 子コンテナの識別名 (例: "web", "batch")
     * @param options コンテナ設定
     */
    createChild(name: string, options?: interfaces.ContainerOptions): S2HierarchicalContainer;
    /**
     * 名前から子コンテナを取得
     */
    getChild(name: string): S2HierarchicalContainer | undefined;
    /**
     * すべての子コンテナを取得
     */
    getChildren(): Map<string, S2HierarchicalContainer>;
    /**
     * コンポーネントを取得 (自コンテナになければ親コンテナを自動検索)
     */
    get<T>(token: interfaces.ServiceIdentifier<T>): T;
    /**
     * コンポーネントがバインドされているか判定 (親コンテナも含む)
     */
    isBound(token: interfaces.ServiceIdentifier<any>): boolean;
    /**
     * 自身のコンテナのみにバインドされているか判定
     */
    isBoundCurrent(token: interfaces.ServiceIdentifier<any>): boolean;
    /**
     * コンポーネントをバインド
     */
    bind<T>(token: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T>;
    /**
     * 指定ディレクトリ配下のクラスをこのコンテナに自動登録する
     */
    autoBind(options: Omit<AutoBindOptions, "baseDir"> & {
        baseDir: string;
    }): string[];
}
//# sourceMappingURL=hierarchicalContainer.d.ts.map