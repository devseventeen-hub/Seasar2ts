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
    db.mockData["user/find.sql"] = [
        { id: 1, user_name: "Seasar Developer", user_email: "dev@seasar.org", created_at: new Date() }
    ];
    db.mockData["user/findAll.sql"] = [
        { id: 1, user_name: "Seasar Developer", user_email: "dev@seasar.org", created_at: new Date() },
        { id: 2, user_name: "TypeScript Fan", user_email: "ts@example.com", created_at: new Date() }
    ];
    // 3. コンテナ初期化 (autoBind により dao/logic/action が自動登録)
    console.log("\n[1] Initializing Seasar2ts Container with autoBind...");
    const container = (0, container_1.initContainer)(db);
    // 4. DI 解決の検証: UserDao の取得と SQL-first クエリ実行
    console.log("\n[2] Resolving UserDao from Container (S2Dao Regeneration)...");
    const userDao = container.get("UserDao");
    console.log("  ✔ UserDao resolved successfully:", userDao.constructor.name);
    // AOP Interceptor (TxInterceptor + LogInterceptor) を付与
    const txInterceptor = container.get("TxInterceptor");
    const logInterceptor = container.get("LogInterceptor");
    const proxiedDao = (0, core_1.applyInterceptors)(userDao, [txInterceptor, logInterceptor]);
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
    const userAction = container.get("UserAction");
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
//# sourceMappingURL=main.js.map