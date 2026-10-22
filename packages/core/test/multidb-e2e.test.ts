import { describe, it, expect } from "vitest";
import { injectable, inject } from "inversify";
import {
  S2HierarchicalContainer,
  Database,
  SQLiteDriver,
  PostgresDriver,
  TxInterceptor,
  executeAutoOrFileQuery,
  applyPointcutAdvisors
} from "../src";

class User {
  id!: number;
  userName!: string;
  email!: string;
}

@injectable()
class UserDao {
  constructor(@inject("Database") private db: Database) {}

  async selectById(id: number): Promise<User> {
    return await executeAutoOrFileQuery({
      db: this.db,
      daoName: "UserDao",
      methodName: "selectById",
      args: [id],
      entityClass: User
    });
  }

  async insert(user: Partial<User>): Promise<number> {
    return await executeAutoOrFileQuery({
      db: this.db,
      daoName: "UserDao",
      methodName: "insert",
      args: [user]
    });
  }
}

describe("3rd Stage Multi-DB Pluggable Driver E2E Verification", () => {
  it("operates identically with SQLiteDriver using '?' placeholders", async () => {
    const container = new S2HierarchicalContainer("root");

    const sqliteDriver = new SQLiteDriver();
    sqliteDriver.setMemoryData("users", [
      { id: 10, user_name: "SQLite User", email: "sqlite@example.com" }
    ]);
    container.bind<Database>("Database").toConstantValue(sqliteDriver);
    container.bind("UserDao").to(UserDao);

    const tx = new TxInterceptor(sqliteDriver);
    const rawDao = container.get<UserDao>("UserDao");

    const proxiedDao = applyPointcutAdvisors(rawDao, "UserDao", [
      { pointcut: { methodPattern: ".*" }, interceptor: tx }
    ]);

    // 1. 自動クエリ実行 (SQLite)
    const user = await proxiedDao.selectById(10);
    expect(user).toBeInstanceOf(User);
    expect(user.id).toBe(10);
    expect(user.userName).toBe("SQLite User");

    // クエリログの検証: プレースホルダーが '?' であること、Tx (BEGIN/COMMIT) でラップされていること
    const logs = sqliteDriver.getQueryLogs();
    expect(logs[0]).toEqual({ sql: "BEGIN TRANSACTION" });
    expect(logs[1].sql).toBe("SELECT * FROM users WHERE id = ?;");
    expect(logs[1].params).toEqual([10]);
    expect(logs[2]).toEqual({ sql: "COMMIT" });
  });

  it("swaps to PostgresDriver using '$1, $2' placeholders WITHOUT changing any DAO code", async () => {
    const container = new S2HierarchicalContainer("root");

    // DAO クラスコードは全く同一のまま、Driver だけを PostgresDriver に差し替え
    const pgDriver = new PostgresDriver();
    pgDriver.setMemoryData("users", [
      { id: 20, user_name: "PostgreSQL User", email: "postgres@example.com" }
    ]);
    container.bind<Database>("Database").toConstantValue(pgDriver);
    container.bind("UserDao").to(UserDao);

    const tx = new TxInterceptor(pgDriver);
    const rawDao = container.get<UserDao>("UserDao");

    const proxiedDao = applyPointcutAdvisors(rawDao, "UserDao", [
      { pointcut: { methodPattern: ".*" }, interceptor: tx }
    ]);

    // 1. 自動クエリ実行 (PostgreSQL)
    const user = await proxiedDao.selectById(20);
    expect(user).toBeInstanceOf(User);
    expect(user.id).toBe(20);
    expect(user.userName).toBe("PostgreSQL User");

    // クエリログの検証: プレースホルダーが '$1' であること、Tx (BEGIN/COMMIT) でラップされていること
    const logs = pgDriver.getQueryLogs();
    expect(logs[0]).toEqual({ sql: "BEGIN" });
    expect(logs[1].sql).toBe("SELECT * FROM users WHERE id = $1;");
    expect(logs[1].params).toEqual([20]);
    expect(logs[2]).toEqual({ sql: "COMMIT" });

    // 2. INSERT の自動生成でも $1, $2 が使用されること
    await proxiedDao.insert({ id: 30, userName: "New User", email: "new@example.com" });
    const insertLog = pgDriver.getQueryLogs().find(l => l.sql.startsWith("INSERT"));
    expect(insertLog?.sql).toBe("INSERT INTO users (id, user_name, email) VALUES ($1, $2, $3);");
    expect(insertLog?.params).toEqual([30, "New User", "new@example.com"]);
  });

  it("TxInterceptor triggers rollback on database failure across drivers", async () => {
    const container = new S2HierarchicalContainer("root");
    const pgDriver = new PostgresDriver();
    container.bind<Database>("Database").toConstantValue(pgDriver);
    container.bind("UserDao").to(UserDao);

    const tx = new TxInterceptor(pgDriver);
    const rawDao = container.get<UserDao>("UserDao");

    // 強制的に例外を発生させるモックメソッド
    (rawDao as any).failMethod = async () => {
      throw new Error("DB Error during transaction");
    };

    const proxiedDao = applyPointcutAdvisors(rawDao, "UserDao", [
      { pointcut: { methodPattern: "failMethod" }, interceptor: tx }
    ]);

    await expect((proxiedDao as any).failMethod()).rejects.toThrow("DB Error during transaction");

    const logs = pgDriver.getQueryLogs();
    expect(logs[0]).toEqual({ sql: "BEGIN" });
    expect(logs[1]).toEqual({ sql: "ROLLBACK" });
  });
});
