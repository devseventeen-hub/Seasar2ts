import "reflect-metadata";
import { Container, interfaces } from "inversify";
/**
 * Seasar2 風の標準 DI コンテナを生成する
 * デフォルトで Singleton スコープとし、auto-binding や Interceptor 付与をサポート
 */
export declare function createContainer(options?: interfaces.ContainerOptions): Container;
//# sourceMappingURL=container.d.ts.map