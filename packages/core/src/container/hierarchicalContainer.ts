import "reflect-metadata";
import { Container, interfaces } from "inversify";
import { autoBind, AutoBindOptions } from "./autoBind";

/**
 * Seasar2 の S2Container の入れ子構造（階層コンテナ）を再現するクラス
 * 親コンテナのコンポーネント（Database, 共通Dao/Service）を子が透過的に継承しつつ、
 * 子コンテナ（Webコンテナ、Batchコンテナ等）独自のバインディングやInterceptorを分離管理する
 */
export class S2HierarchicalContainer {
  private container: Container;
  private parentContainer?: S2HierarchicalContainer;
  private children: Map<string, S2HierarchicalContainer> = new Map();
  public readonly name: string;

  constructor(
    name: string = "root",
    options?: interfaces.ContainerOptions,
    parent?: S2HierarchicalContainer
  ) {
    this.name = name;
    this.parentContainer = parent;
    this.container = new Container({
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
  getRawContainer(): Container {
    return this.container;
  }

  /**
   * 親コンテナを取得
   */
  getParent(): S2HierarchicalContainer | undefined {
    return this.parentContainer;
  }

  /**
   * 子コンテナを生成して階層ツリーに追加する
   * @param name 子コンテナの識別名 (例: "web", "batch")
   * @param options コンテナ設定
   */
  createChild(name: string, options?: interfaces.ContainerOptions): S2HierarchicalContainer {
    const child = new S2HierarchicalContainer(name, options, this);
    this.children.set(name, child);
    return child;
  }

  /**
   * 名前から子コンテナを取得
   */
  getChild(name: string): S2HierarchicalContainer | undefined {
    return this.children.get(name);
  }

  /**
   * すべての子コンテナを取得
   */
  getChildren(): Map<string, S2HierarchicalContainer> {
    return this.children;
  }

  /**
   * コンポーネントを取得 (自コンテナになければ親コンテナを自動検索)
   */
  get<T>(token: interfaces.ServiceIdentifier<T>): T {
    return this.container.get<T>(token);
  }

  /**
   * コンポーネントがバインドされているか判定 (親コンテナも含む)
   */
  isBound(token: interfaces.ServiceIdentifier<any>): boolean {
    return this.container.isBound(token);
  }

  /**
   * 自身のコンテナのみにバインドされているか判定
   */
  isBoundCurrent(token: interfaces.ServiceIdentifier<any>): boolean {
    return this.container.isCurrentBound(token);
  }

  /**
   * コンポーネントをバインド
   */
  bind<T>(token: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T> {
    return this.container.bind<T>(token);
  }

  /**
   * 指定ディレクトリ配下のクラスをこのコンテナに自動登録する
   */
  autoBind(options: Omit<AutoBindOptions, "baseDir"> & { baseDir: string }): string[] {
    return autoBind(this.container, options);
  }
}
