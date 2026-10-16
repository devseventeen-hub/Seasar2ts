import { describe, it, expect } from "vitest";
import {
  AutoSqlGenerator,
  inferTableName,
  camelToSnake,
  executeAutoOrFileQuery
} from "../src/dao/autoSql";
import { MockDatabase } from "../src/dao/database";

class User {
  id!: number;
  userName!: string;
  email!: string;
}

describe("S2Dao Automatic SQL Generation", () => {
  it("camelToSnake and inferTableName should convert conventions", () => {
    expect(camelToSnake("userName")).toBe("user_name");
    expect(camelToSnake("createdAtTime")).toBe("created_at_time");

    expect(inferTableName("UserDao")).toBe("users");
    expect(inferTableName("ItemCategoryDao")).toBe("item_categories");
    expect(inferTableName("EmployeeRepository")).toBe("employees");
  });

  it("AutoSqlGenerator should generate SQL for convention methods", () => {
    // 1. selectById
    const byId = AutoSqlGenerator.generate("users", "selectById", [42]);
    expect(byId.sql).toBe("SELECT * FROM users WHERE id = ?;");
    expect(byId.params).toEqual([42]);
    expect(byId.type).toBe("selectOne");

    // 2. selectAll
    const all = AutoSqlGenerator.generate("users", "selectAll", []);
    expect(all.sql).toBe("SELECT * FROM users;");
    expect(all.params).toEqual([]);
    expect(all.type).toBe("selectList");

    // 3. selectByExample
    const example = AutoSqlGenerator.generate("users", "selectByExample", [{ userName: "Alice", email: "alice@example.com" }]);
    expect(example.sql).toBe("SELECT * FROM users WHERE user_name = ? AND email = ?;");
    expect(example.params).toEqual(["Alice", "alice@example.com"]);
    expect(example.type).toBe("selectList");

    // 4. insert
    const ins = AutoSqlGenerator.generate("users", "insert", [{ id: 1, userName: "Bob" }]);
    expect(ins.sql).toBe("INSERT INTO users (id, user_name) VALUES (?, ?);");
    expect(ins.params).toEqual([1, "Bob"]);
    expect(ins.type).toBe("execute");

    // 5. update
    const upd = AutoSqlGenerator.generate("users", "update", [{ id: 1, userName: "Charlie" }]);
    expect(upd.sql).toBe("UPDATE users SET user_name = ? WHERE id = ?;");
    expect(upd.params).toEqual(["Charlie", 1]);
    expect(upd.type).toBe("execute");
  });

  it("executeAutoOrFileQuery should execute auto-generated query when no SQL file exists", async () => {
    const db = new MockDatabase();
    db.mockData["select * from users where id = ?"] = [
      { id: 99, user_name: "Auto User", email: "auto@example.com" }
    ];

    const result = await executeAutoOrFileQuery<User>({
      db,
      daoName: "UserDao",
      methodName: "selectById",
      args: [99],
      entityClass: User
    });

    expect(result).toBeInstanceOf(User);
    expect(result.id).toBe(99);
    expect(result.userName).toBe("Auto User");
  });
});
