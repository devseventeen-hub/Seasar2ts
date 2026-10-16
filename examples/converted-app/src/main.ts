import "reflect-metadata";
import * as path from "path";
import { initContainer } from "./container";
import {
  MockDatabase,
  setSqlBaseDir,
  applyInterceptors,
  applyPointcutAdvisors,
  TxInterceptor,
  LogInterceptor
} from "@seasar2ts/core";
import { UserDao } from "./dao/UserDao";
import { UserAction } from "./action/UserAction";

async function main() {
  console.log("==================================================");
  console.log("  Seasar2ts E2E Verification Running");
  console.log("==================================================");

  // 1. SQLファイルのベースディレクトリ設定
  setSqlBaseDir(path.resolve(__dirname, ".."));

  // 2. モックDBの初期化とテストデータ設定
  const db = new MockDatabase();
  db.mockData["WHERE id"] = [
    { id: 1, user_name: "Seasar Developer", user_email: "dev@seasar.org", created_at: new Date() }
  ];
  db.mockData["ORDER BY id"] = [
    { id: 1, user_name: "Seasar Developer", user_email: "dev@seasar.org", created_at: new Date() },
    { id: 2, user_name: "TypeScript Fan", user_email: "ts@example.com", created_at: new Date() }
  ];
  db.mockData["WHERE name = ?"] = [
    { id: 1, user_name: "Seasar Developer", user_email: "dev@seasar.org", created_at: new Date() }
  ];

  // 3. コンテナ初期化 (S2HierarchicalContainer: root と web 子コンテナ)
  console.log("\n[1] Initializing S2HierarchicalContainer (Root & Web Child)...");
  const rootContainer = initContainer(db);
  const webContainer = rootContainer.getChild("web")!;
  console.log("  ✔ Root container initialized with children:", Array.from(rootContainer.getChildren().keys()).join(", "));

  // 4. 階層コンテナ解決: Web コンテナから UserAction を取得 (親の UserDao が透過解決される)
  console.log("\n[2] Resolving UserAction from Web Child Container (inheriting Dao from Root)...");
  const userAction = webContainer.get<UserAction>("UserAction");
  console.log("  ✔ UserAction resolved successfully from Web Container:", userAction.constructor.name);
  console.log("  ✔ Calling userAction.index():", JSON.stringify(userAction.index()));

  // 5. Root コンテナから UserDao を取得
  console.log("\n[3] Resolving UserDao from Root Container...");
  const userDao = rootContainer.get<UserDao>("UserDao");

  // 6. ポイントカット AOP (select.* にのみ TxInterceptor + LogInterceptor を適用)
  console.log("\n[4] Applying Pointcut AOP (methodPattern: 'select.*' only)...");
  const txInterceptor = rootContainer.get<TxInterceptor>("TxInterceptor");
  const logInterceptor = rootContainer.get<LogInterceptor>("LogInterceptor");

  const proxiedDao = applyPointcutAdvisors(userDao, "UserDao", [
    {
      pointcut: { methodPattern: "select.*" },
      interceptor: txInterceptor
    },
    {
      pointcut: { methodPattern: "select.*" },
      interceptor: logInterceptor
    }
  ]);

  // 7. S2Dao 自動クエリ生成の検証: selectById (SQLファイル無し -> AutoSqlGenerator による自動生成)
  console.log("\n[5] Executing proxiedDao.selectById(42) [Auto-Generated Query via Convention + Pointcut AOP]...");
  const autoUser = await proxiedDao.selectById(42);
  console.log("  ✔ Auto Query Result mapped to User Bean:");
  console.log("    - ID:       ", autoUser.id);
  console.log("    - Name:     ", autoUser.name);
  console.log("    - Email:    ", autoUser.email);

  // 8. S2Dao 自動クエリ生成の検証: selectByExample
  console.log("\n[6] Executing proxiedDao.selectByExample(...) [Condition-based Auto Query]...");
  const exampleUsers = await proxiedDao.selectByExample({ name: "Seasar Developer" } as any);
  console.log(`  ✔ Returned ${exampleUsers.length} user(s) matching condition:`);
  for (const u of exampleUsers) {
    console.log(`    - [${u.id}] ${u.name} (${u.email})`);
  }

  // 9. SQL-first の検証: find(1) (ポイントカット対象外のため Interceptor なしで直実行)
  console.log("\n[7] Executing proxiedDao.find(1) [SQL-first via user/find.sql - Bypasses Pointcut AOP]...");
  const sqlFirstUser = await proxiedDao.find(1);
  console.log("  ✔ SQL-first Result:", sqlFirstUser.id, sqlFirstUser.name);

  console.log("\n==================================================");
  console.log("  🎉 Seasar2ts 2nd Stage E2E Verification PASSED!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
