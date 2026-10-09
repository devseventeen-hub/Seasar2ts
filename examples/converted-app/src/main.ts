import "reflect-metadata";
import * as path from "path";
import { initContainer } from "./container";
import { MockDatabase, setSqlBaseDir, applyInterceptors, TxInterceptor, LogInterceptor } from "@seasar2ts/core";
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

  // 3. コンテナ初期化 (autoBind により dao/logic/action が自動登録)
  console.log("\n[1] Initializing Seasar2ts Container with autoBind...");
  const container = initContainer(db);

  // 4. DI 解決の検証: UserDao の取得と SQL-first クエリ実行
  console.log("\n[2] Resolving UserDao from Container (S2Dao Regeneration)...");
  const userDao = container.get<UserDao>("UserDao");
  console.log("  ✔ UserDao resolved successfully:", userDao.constructor.name);

  // AOP Interceptor (TxInterceptor + LogInterceptor) を付与
  const txInterceptor = container.get<TxInterceptor>("TxInterceptor");
  const logInterceptor = container.get<LogInterceptor>("LogInterceptor");
  const proxiedDao = applyInterceptors(userDao, [txInterceptor, logInterceptor]);

  console.log("\n[3] Executing proxiedDao.find(1) via SQL-first DAO + AOP...");
  const user = await proxiedDao.find(1);
  console.log("  ✔ Query Result mapped to User Bean:");
  console.log("    - ID:       ", user.id);
  console.log("    - Name:     ", user.name);
  console.log("    - Email:    ", user.email);

  console.log("\n[4] Executing proxiedDao.findAll() (List mapping)...");
  const allUsers = await proxiedDao.findAll();
  console.log(`  ✔ Returned ${allUsers.length} users:`);
  for (const u of allUsers) {
    console.log(`    - [${u.id}] ${u.name} (${u.email})`);
  }

  // 5. 階層的 DI の検証 (Action -> Service -> Dao)
  console.log("\n[5] Resolving UserAction with Hierarchical DI (Action -> Service -> Dao)...");
  const userAction = container.get<UserAction>("UserAction");
  console.log("  ✔ UserAction resolved successfully:", userAction.constructor.name);
  console.log("  ✔ Calling userAction.index():", userAction.index());

  console.log("\n==================================================");
  console.log("  🎉 Seasar2ts E2E Verification PASSED Successfully!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
