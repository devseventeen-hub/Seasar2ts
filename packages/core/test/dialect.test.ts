import { describe, it, expect } from "vitest";
import { SQLiteDialect, PostgresDialect, MySQLDialect } from "../src/dao/dialect";
import { MockDatabase } from "../src/dao/database";

describe("DbDialect", () => {
  it("SQLiteDialect uses '?' placeholder and double quotes", () => {
    const dialect = new SQLiteDialect();
    expect(dialect.name).toBe("sqlite");
    expect(dialect.formatPlaceholder(1)).toBe("?");
    expect(dialect.formatPlaceholder(2)).toBe("?");
    expect(dialect.quoteIdentifier("user_table")).toBe('"user_table"');
  });

  it("PostgresDialect uses '$1', '$2' placeholders and double quotes", () => {
    const dialect = new PostgresDialect();
    expect(dialect.name).toBe("postgresql");
    expect(dialect.formatPlaceholder(1)).toBe("$1");
    expect(dialect.formatPlaceholder(2)).toBe("$2");
    expect(dialect.formatPlaceholder(10)).toBe("$10");
    expect(dialect.quoteIdentifier("user_table")).toBe('"user_table"');
  });

  it("MySQLDialect uses '?' placeholder and backticks", () => {
    const dialect = new MySQLDialect();
    expect(dialect.name).toBe("mysql");
    expect(dialect.formatPlaceholder(1)).toBe("?");
    expect(dialect.quoteIdentifier("user_table")).toBe("`user_table`");
  });

  it("MockDatabase implements DbConnection and Database seamlessly", async () => {
    const pgDialect = new PostgresDialect();
    const db = new MockDatabase(pgDialect);

    expect(db.dialect.name).toBe("postgresql");

    await db.begin();
    expect(db.inTransaction).toBe(true);
    await db.commit();
    expect(db.inTransaction).toBe(false);

    db.mockData["users"] = [{ id: 1, name: "Alice" }];
    const rows = await db.queryMany("SELECT * FROM users");
    expect(rows).toEqual([{ id: 1, name: "Alice" }]);
  });
});
