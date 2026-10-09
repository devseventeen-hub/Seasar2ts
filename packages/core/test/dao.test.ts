import { describe, it, expect, beforeEach } from "vitest";
import { mapRowToBean, mapRowsToBeans, snakeToCamel } from "../src/dao/mapping";
import { MockDatabase } from "../src/dao/database";
import { loadSql, setSqlBaseDir, clearSqlCache } from "../src/dao/loadSql";
import * as fs from "fs";
import * as path from "path";

class User {
  id!: number;
  userName!: string;
  userEmail!: string;
}

describe("S2Dao DAO & Mapping Engine", () => {
  it("snakeToCamel should convert column names", () => {
    expect(snakeToCamel("user_name")).toBe("userName");
    expect(snakeToCamel("id")).toBe("id");
    expect(snakeToCamel("created_at_time")).toBe("createdAtTime");
  });

  it("mapRowToBean should map snake_case columns to camelCase properties", () => {
    const row = {
      id: 101,
      user_name: "Tanaka",
      user_email: "tanaka@example.com"
    };

    const user = mapRowToBean(row, User);
    expect(user).toBeInstanceOf(User);
    expect(user.id).toBe(101);
    expect(user.userName).toBe("Tanaka");
    expect(user.userEmail).toBe("tanaka@example.com");
  });

  it("mapRowsToBeans should map array of rows", () => {
    const rows = [
      { id: 1, user_name: "User1" },
      { id: 2, user_name: "User2" }
    ];

    const users = mapRowsToBeans(rows, User);
    expect(users.length).toBe(2);
    expect(users[0].userName).toBe("User1");
    expect(users[1].userName).toBe("User2");
  });

  describe("loadSql", () => {
    const testDir = path.join(__dirname, "temp-sql");

    beforeEach(() => {
      clearSqlCache();
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      setSqlBaseDir(testDir);
    });

    it("should load SQL file and cache content", () => {
      const sqlFilePath = path.join(testDir, "findUser.sql");
      fs.writeFileSync(sqlFilePath, "SELECT * FROM users WHERE id = /*id*/1;");

      const loaded = loadSql("findUser.sql");
      expect(loaded).toBe("SELECT * FROM users WHERE id = /*id*/1;");

      // キャッシュ確認 (ファイルを書き換えてもキャッシュから返る)
      fs.writeFileSync(sqlFilePath, "SELECT 1;");
      expect(loadSql("findUser.sql")).toBe("SELECT * FROM users WHERE id = /*id*/1;");
    });
  });
});
