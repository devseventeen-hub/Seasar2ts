import "reflect-metadata";
import * as path from "path";
import {
  createContainer,
  autoBind,
  applyInterceptors,
  TxInterceptor,
  LogInterceptor,
  MockDatabase,
  Database
} from "@seasar2ts/core";

export function initContainer(dbInstance?: Database) {
  const container = createContainer();

  // 1. データベースのバインド
  const db = dbInstance || new MockDatabase();
  container.bind<Database>("Database").toConstantValue(db);

  // 2. Interceptor の登録
  const txInterceptor = new TxInterceptor(db);
  const logInterceptor = new LogInterceptor();
  container.bind("TxInterceptor").toConstantValue(txInterceptor);
  container.bind("LogInterceptor").toConstantValue(logInterceptor);

  // 3. 命名規約による自動バインド (src/action, src/logic, src/dao)
  const baseDir = __dirname;
  autoBind(container, { baseDir: path.join(baseDir, "dao") });
  autoBind(container, { baseDir: path.join(baseDir, "logic") });
  autoBind(container, { baseDir: path.join(baseDir, "action") });

  return container;
}
