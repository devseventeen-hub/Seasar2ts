import { describe, it, expect } from "vitest";
import { TxInterceptor, getCurrentTxConnection, createTransactionalDatabase } from "../src/aop/txInterceptor";
import { GenericConnectionPool, PooledConnection } from "../src/dao/pool";
import { MockDatabase, Database } from "../src/dao/database";
import { applyInterceptors, MethodInvocation } from "../src/aop/interceptor";
import { executeAutoOrFileQuery } from "../src/dao/autoSql";

class AccountDao {
  constructor(private db: Database) {}

  async findById(id: number) {
    return await executeAutoOrFileQuery({
      db: this.db,
      daoName: "AccountDao",
      methodName: "findById",
      args: [id]
    });
  }

  async update(account: { id: number; balance: number }) {
    return await executeAutoOrFileQuery({
      db: this.db,
      daoName: "AccountDao",
      methodName: "update",
      args: [account]
    });
  }
}

class TransferService {
  constructor(public accountDao: AccountDao) {}

  async transfer(fromId: number, toId: number, amount: number) {
    const conn = getCurrentTxConnection() as PooledConnection;
    const leasedId = conn?.connectionId;

    await this.accountDao.update({ id: fromId, balance: 1000 - amount });
    await this.accountDao.update({ id: toId, balance: 2000 + amount });

    return { success: true, leasedId };
  }

  async transferWithFailure(fromId: number, toId: number, amount: number) {
    await this.accountDao.update({ id: fromId, balance: 1000 - amount });
    throw new Error("Insufficient funds or network error");
  }
}

describe("TxInterceptor & Connection Pool Integration (Phase 5)", () => {
  it("should lease a single connection from pool and share it across multiple DAO calls in a transaction", async () => {
    const pool = new GenericConnectionPool(
      { min: 1, max: 5 },
      async () => new MockDatabase()
    );

    const txInterceptor = new TxInterceptor(pool);
    const mockDb = new MockDatabase();
    const accountDao = new AccountDao(createTransactionalDatabase(mockDb));
    const service = new TransferService(accountDao);

    // Apply TxInterceptor to TransferService
    const transactionalService = applyInterceptors(service, [txInterceptor]);

    expect(pool.getStatus().active).toBe(0);

    const result = await transactionalService.transfer(1, 2, 300);
    expect(result.success).toBe(true);
    expect(result.leasedId).toBeDefined();

    // After transaction commits, connection must be returned to pool (active = 0, idle = 1)
    expect(pool.getStatus().active).toBe(0);
    expect(pool.getStatus().idle).toBe(1);

    await pool.close();
  });

  it("should rollback and release connection back to pool without leaks when an exception is thrown", async () => {
    const pool = new GenericConnectionPool(
      { min: 1, max: 5 },
      async () => new MockDatabase()
    );

    const txInterceptor = new TxInterceptor(pool);
    const mockDb = new MockDatabase();
    const accountDao = new AccountDao(createTransactionalDatabase(mockDb));
    const service = new TransferService(accountDao);

    const transactionalService = applyInterceptors(service, [txInterceptor]);

    expect(pool.getStatus().active).toBe(0);

    let errorThrown = false;
    try {
      await transactionalService.transferWithFailure(1, 2, 500);
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toBe("Insufficient funds or network error");
    }

    expect(errorThrown).toBe(true);
    // Verified: No connection leak! Active count must be 0, returned to idle.
    expect(pool.getStatus().active).toBe(0);
    expect(pool.getStatus().idle).toBe(1);

    await pool.close();
  });

  it("should handle multiple concurrent transactions without deadlock or connection leaks", async () => {
    const pool = new GenericConnectionPool(
      { min: 1, max: 10 },
      async () => new MockDatabase()
    );

    const txInterceptor = new TxInterceptor(pool);
    const mockDb = new MockDatabase();
    const accountDao = new AccountDao(createTransactionalDatabase(mockDb));
    const service = new TransferService(accountDao);
    const transactionalService = applyInterceptors(service, [txInterceptor]);

    const tasks = Array.from({ length: 15 }, (_, i) =>
      transactionalService.transfer(i, i + 100, 10)
    );

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(15);

    // All leased connections must be safely released
    expect(pool.getStatus().active).toBe(0);
    expect(pool.getStatus().waiting).toBe(0);

    await pool.close();
  });
});
