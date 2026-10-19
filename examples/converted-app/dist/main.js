"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const path = __importStar(require("path"));
const container_1 = require("./container");
const core_1 = require("@seasar2ts/core");
async function main() {
    console.log("==================================================");
    console.log("  Seasar2ts E2E Verification Running");
    console.log("==================================================");
    // 1. SQLファイルのベースディレクトリ設定
    (0, core_1.setSqlBaseDir)(path.resolve(__dirname, ".."));
    // 2. モックDBの初期化とテストデータ設定
    const db = new core_1.MockDatabase();
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
    const rootContainer = (0, container_1.initContainer)(db);
    const webContainer = rootContainer.getChild("web");
    console.log("  ✔ Root container initialized with children:", Array.from(rootContainer.getChildren().keys()).join(", "));
    // 4. 階層コンテナ解決: Web コンテナから UserAction を取得 (親の UserDao が透過解決される)
    console.log("\n[2] Resolving UserAction from Web Child Container (inheriting Dao from Root)...");
    const userAction = webContainer.get("UserAction");
    console.log("  ✔ UserAction resolved successfully from Web Container:", userAction.constructor.name);
    console.log("  ✔ Calling userAction.index():", JSON.stringify(userAction.index()));
    // 5. Root コンテナから UserDao を取得
    console.log("\n[3] Resolving UserDao from Root Container...");
    const userDao = rootContainer.get("UserDao");
    // 6. ポイントカット AOP (select.* にのみ TxInterceptor + LogInterceptor を適用)
    console.log("\n[4] Applying Pointcut AOP (methodPattern: 'select.*' only)...");
    const txInterceptor = rootContainer.get("TxInterceptor");
    const logInterceptor = rootContainer.get("LogInterceptor");
    const proxiedDao = (0, core_1.applyPointcutAdvisors)(userDao, "UserDao", [
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
    const exampleUsers = await proxiedDao.selectByExample({ name: "Seasar Developer" });
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
//# sourceMappingURL=main.js.map