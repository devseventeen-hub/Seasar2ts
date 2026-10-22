import { describe, it, expect } from "vitest";
import { SQLiteDriver } from "../src/dao/drivers/sqliteDriver";
import { PostgresDriver } from "../src/dao/drivers/postgresDriver";

describe("Pluggable DB Drivers", () => {
  describe("SQLiteDriver", () => {
    it("handles transactions with state management", async () => {
      const driver = new SQLiteDriver();
      expect(driver.dialect.name).toBe("sqlite");
      expect(driver.inTransaction).toBe(false);

      await driver.begin();
      expect(driver.inTransaction).toBe(true);

      await driver.commit();
      expect(driver.inTransaction).toBe(false);

      await driver.beginTransaction();
      expect(driver.inTransaction).toBe(true);

      await driver.rollback();
      expect(driver.inTransaction).toBe(false);

      const logs = driver.getQueryLogs();
      expect(logs).toEqual([
        { sql: "BEGIN TRANSACTION" },
        { sql: "COMMIT" },
        { sql: "BEGIN TRANSACTION" },
        { sql: "ROLLBACK" }
      ]);
    });

    it("executes queries using memory fallback or client", async () => {
      const driver = new SQLiteDriver();
      driver.setMemoryData("departments", [{ id: 10, name: "Engineering" }]);

      const rows = await driver.queryMany("SELECT * FROM departments");
      expect(rows).toEqual([{ id: 10, name: "Engineering" }]);

      const single = await driver.queryOne("SELECT * FROM departments WHERE id = ?", [10]);
      expect(single).toEqual({ id: 10, name: "Engineering" });

      const count = await driver.execute("UPDATE departments SET name = ?", ["Sales"]);
      expect(count).toBe(1);
    });

    it("delegates to sqlite client if provided", async () => {
      const executedCommands: string[] = [];
      const mockClient = {
        exec: async (sql: string) => {
          executedCommands.push(sql);
        },
        all: (sql: string, params: any[], cb: any) => {
          cb(null, [{ val: 42 }]);
        },
        run: function (sql: string, params: any[], cb: any) {
          cb.call({ changes: 2 }, null);
        }
      };

      const driver = new SQLiteDriver({ client: mockClient });
      await driver.begin();
      expect(executedCommands).toContain("BEGIN TRANSACTION;");

      const rows = await driver.queryList("SELECT 42");
      expect(rows).toEqual([{ val: 42 }]);

      const changes = await driver.execute("UPDATE t SET x = 1");
      expect(changes).toBe(2);

      await driver.commit();
      expect(executedCommands).toContain("COMMIT;");
    });
  });

  describe("PostgresDriver", () => {
    it("handles transactions with state management", async () => {
      const driver = new PostgresDriver();
      expect(driver.dialect.name).toBe("postgresql");
      expect(driver.inTransaction).toBe(false);

      await driver.begin();
      expect(driver.inTransaction).toBe(true);

      await driver.commit();
      expect(driver.inTransaction).toBe(false);

      await driver.begin();
      await driver.rollback();
      expect(driver.inTransaction).toBe(false);

      const logs = driver.getQueryLogs();
      expect(logs).toEqual([
        { sql: "BEGIN" },
        { sql: "COMMIT" },
        { sql: "BEGIN" },
        { sql: "ROLLBACK" }
      ]);
    });

    it("executes queries using memory fallback", async () => {
      const driver = new PostgresDriver();
      driver.setMemoryData("items", [{ id: 1, title: "Book" }]);

      const rows = await driver.queryMany("SELECT * FROM items");
      expect(rows).toEqual([{ id: 1, title: "Book" }]);

      const item = await driver.queryOne("SELECT * FROM items WHERE id = $1", [1]);
      expect(item).toEqual({ id: 1, title: "Book" });
    });

    it("delegates to pg client if provided", async () => {
      const executedQueries: { sql: string; params?: any[] }[] = [];
      const mockPgClient = {
        query: async (sql: string, params?: any[]) => {
          executedQueries.push({ sql, params });
          if (sql === "SELECT * FROM users WHERE id = $1") {
            return { rows: [{ id: 1, name: "Bob" }], rowCount: 1 };
          }
          if (sql.startsWith("UPDATE")) {
            return { rows: [], rowCount: 3 };
          }
          return { rows: [], rowCount: 0 };
        }
      };

      const driver = new PostgresDriver({ client: mockPgClient });
      await driver.begin();
      expect(executedQueries).toContainEqual({ sql: "BEGIN", params: undefined });

      const user = await driver.queryOne("SELECT * FROM users WHERE id = $1", [1]);
      expect(user).toEqual({ id: 1, name: "Bob" });

      const updated = await driver.execute("UPDATE users SET active = true");
      expect(updated).toBe(3);

      await driver.commit();
      expect(executedQueries).toContainEqual({ sql: "COMMIT", params: undefined });
    });
  });
});
