"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2HierarchicalContainer = void 0;
require("reflect-metadata");
const inversify_1 = require("inversify");
const autoBind_1 = require("./autoBind");
/**
 * Seasar2 の S2Container の入れ子構造（階層コンテナ）を再現するクラス
 * 親コンテナのコンポーネント（Database, 共通Dao/Service）を子が透過的に継承しつつ、
 * 子コンテナ（Webコンテナ、Batchコンテナ等）独自のバインディングやInterceptorを分離管理する
 */
class S2HierarchicalContainer {
    container;
    parentContainer;
    children = new Map();
    name;
    constructor(name = "root", options, parent) {
        this.name = name;
        this.parentContainer = parent;
        this.container = new inversify_1.Container({
            defaultScope: "Singleton",
            ...options
        });
        if (parent) {
            this.container.parent = parent.getRawContainer();
        }
    }
    /**
     * 内部の InversifyJS Container を取得
     */
    getRawContainer() {
        return this.container;
    }
    /**
     * 親コンテナを取得
     */
    getParent() {
        return this.parentContainer;
    }
    /**
     * 子コンテナを生成して階層ツリーに追加する
     * @param name 子コンテナの識別名 (例: "web", "batch")
     * @param options コンテナ設定
     */
    createChild(name, options) {
        const child = new S2HierarchicalContainer(name, options, this);
        this.children.set(name, child);
        return child;
    }
    /**
     * 名前から子コンテナを取得
     */
    getChild(name) {
        return this.children.get(name);
    }
    /**
     * すべての子コンテナを取得
     */
    getChildren() {
        return this.children;
    }
    /**
     * コンポーネントを取得 (自コンテナになければ親コンテナを自動検索)
     */
    get(token) {
        return this.container.get(token);
    }
    /**
     * コンポーネントがバインドされているか判定 (親コンテナも含む)
     */
    isBound(token) {
        return this.container.isBound(token);
    }
    /**
     * 自身のコンテナのみにバインドされているか判定
     */
    isBoundCurrent(token) {
        return this.container.isCurrentBound(token);
    }
    /**
     * コンポーネントをバインド
     */
    bind(token) {
        return this.container.bind(token);
    }
    /**
     * 指定ディレクトリ配下のクラスをこのコンテナに自動登録する
     */
    autoBind(options) {
        return (0, autoBind_1.autoBind)(this.container, options);
    }
}
exports.S2HierarchicalContainer = S2HierarchicalContainer;
//# sourceMappingURL=hierarchicalContainer.js.map