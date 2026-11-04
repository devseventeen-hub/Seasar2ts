import { describe, it, expect } from "vitest";
import { GenericConnectionPool } from "../src/dao/pool";
import { MockDatabase } from "../src/dao/database";
import { PostgresPoolDriver } from "../src/dao/drivers/postgresPoolDriver";
import { MySQLPoolDriver } from "../src/dao/drivers/mysqlPoolDriver";

describe("Connection Pool (Phase 4)", () => {
  it("should acquire and release connections and track pool status correctly", async () => {
    let createdCount = 0;
    const pool = new GenericConnectionPool(
      { min: 1, max: 3, acquireTimeoutMillis: 500 },
      async () => {
        createdCount++;
        return new MockDatabase();
      }
    );

    expect(pool.getStatus()).toEqual({ total: 0, active: 0, idle: 0, waiting: 0 });

    const conn1 = await pool.acquire();
    expect(conn1).toBeDefined();
    expect(conn1.connectionId).toBe("conn_1");
    expect(conn1.isReleased).toBe(false);
    expect(pool.getStatus()).toEqual({ total: 1, active: 1, idle: 0, waiting: 0 });

    const conn2 = await pool.acquire();
    expect(conn2.connectionId).toBe("conn_2");
    expect(pool.getStatus()).toEqual({ total: 2, active: 2, idle: 0, waiting: 0 });

    // Release conn1
    await conn1.release();
    expect(conn1.isReleased).toBe(true);
    expect(pool.getStatus()).toEqual({ total: 2, active: 1, idle: 1, waiting: 0 });

    // Next acquire should reuse idle conn1
    const conn3 = await pool.acquire();
    expect(conn3.connectionId).toBe("conn_1");
    expect(pool.getStatus()).toEqual({ total: 2, active: 2, idle: 0, waiting: 0 });

    await conn2.release();
    await conn3.release();
    expect(pool.getStatus()).toEqual({ total: 2, active: 0, idle: 2, waiting: 0 });

    await pool.close();
  });

  it("should guarantee release in withConnection even when an exception is thrown", async () => {
    const pool = new GenericConnectionPool(
      { max: 2 },
      async () => new MockDatabase()
    );

    let caughtError = false;
    try {
      await pool.withConnection(async (conn) => {
        expect(pool.getStatus().active).toBe(1);
        throw new Error("Simulated query failure");
      });
    } catch (err: any) {
      caughtError = true;
      expect(err.message).toBe("Simulated query failure");
    }

    expect(caughtError).toBe(true);
    // Connection must be returned to idle pool, active must be 0
    expect(pool.getStatus().active).toBe(0);
    expect(pool.getStatus().idle).toBe(1);

    await pool.close();
  });

  it("should queue requests and throw timeout when pool is saturated", async () => {
    const pool = new GenericConnectionPool(
      { max: 1, acquireTimeoutMillis: 100 },
      async () => new MockDatabase()
    );

    const conn = await pool.acquire();
    expect(pool.getStatus().active).toBe(1);

    // Attempting to acquire when max=1 and timeout=100ms
    await expect(pool.acquire()).rejects.toThrow(/timed out.*pool exhausted/);

    await conn.release();
    await pool.close();
  });

  it("should execute queries and manage transactions with PostgresPoolDriver", async () => {
    const pgPool = new PostgresPoolDriver({
      pool: { max: 5 }
    });

    // Query outside explicit transaction (auto withConnection)
    const count = await pgPool.execute("SELECT 1");
    expect(count).toBe(1);
    expect(pgPool.getStatus().active).toBe(0);

    // Transaction lifecycle
    await pgPool.beginTransaction();
    expect(pgPool.getStatus().active).toBe(1);

    await pgPool.execute("UPDATE users SET name = $1 WHERE id = $2", ["Alice", 1]);
    await pgPool.commit();

    // Must be released after commit
    expect(pgPool.getStatus().active).toBe(0);
    expect(pgPool.getStatus().idle).toBe(1);

    await pgPool.close();
  });

  it("should support MySQLPoolDriver with MySQL dialect and pool lifecycle", async () => {
    const myPool = new MySQLPoolDriver({
      pool: { max: 3 }
    });

    expect(myPool.dialect.name).toBe("mysql");
    expect(myPool.dialect.quoteIdentifier("users")).toBe("`users`");
    expect(myPool.dialect.formatPlaceholder(1)).toBe("?");

    await myPool.beginTransaction();
    expect(myPool.getStatus().active).toBe(1);
    await myPool.rollback();

    // Must be released after rollback
    expect(myPool.getStatus().active).toBe(0);
    expect(myPool.getStatus().idle).toBe(1);

    await myPool.close();
  });
});
