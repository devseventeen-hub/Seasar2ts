import "reflect-metadata";
import { Container, interfaces } from "inversify";

/**
 * Seasar2 風の標準 DI コンテナを生成する
 * デフォルトで Singleton スコープとし、auto-binding や Interceptor 付与をサポート
 */
export function createContainer(options?: interfaces.ContainerOptions): Container {
  return new Container({
    defaultScope: "Singleton",
    ...options
  });
}
