import "reflect-metadata";
import * as path from "path";
import {
  S2HierarchicalContainer,
  autoBind,
  applyInterceptors,
  applyPointcutAdvisors,
  PointcutAdvisor,
  TxInterceptor,
  LogInterceptor,
  MockDatabase,
  Database
} from "@seasar2ts/core";

export function initContainer(dbInstance?: Database): S2HierarchicalContainer {
  // 1. Root コンテナの生成 (共通リソース・DAO層)
  const rootContainer = new S2HierarchicalContainer("root");

  const db = dbInstance || new MockDatabase();
  rootContainer.bind<Database>("Database").toConstantValue(db);

  // 2. 共通 Interceptor の登録
  const txInterceptor = new TxInterceptor(db);
  const logInterceptor = new LogInterceptor();
  rootContainer.bind("TxInterceptor").toConstantValue(txInterceptor);
  rootContainer.bind("LogInterceptor").toConstantValue(logInterceptor);

  const baseDir = __dirname;

  // Root コンテナに DAO を自動登録
  rootContainer.autoBind({ baseDir: path.join(baseDir, "dao") });

  // 3. Web 用子コンテナの生成 (Action / Logic 層)
  const webContainer = rootContainer.createChild("web");
  webContainer.autoBind({ baseDir: path.join(baseDir, "logic") });
  webContainer.autoBind({ baseDir: path.join(baseDir, "action") });

  return rootContainer;
}
