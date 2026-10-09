import { describe, it, expect, vi } from "vitest";
import { applyInterceptors, Interceptor, MethodInvocation } from "../src/aop/interceptor";
import { TxInterceptor } from "../src/aop/txInterceptor";
import { LogInterceptor } from "../src/aop/logInterceptor";
import { MockDatabase } from "../src/dao/database";

describe("AOP Interceptor Engine", () => {
  class SampleService {
    greet(name: string): string {
      return `Hello, ${name}!`;
    }

    async failMethod(): Promise<void> {
      throw new Error("Something broke");
    }
  }

  it("should intercept method calls before and after execution", () => {
    const logs: string[] = [];
    const testInterceptor: Interceptor = {
      invoke(invocation: MethodInvocation) {
        logs.push(`before ${String(invocation.method)}`);
        const result = invocation.proceed();
        logs.push(`after ${String(invocation.method)}`);
        return `${result} (intercepted)`;
      }
    };

    const target = new SampleService();
    const proxy = applyInterceptors(target, [testInterceptor]);

    const result = proxy.greet("Seasar");
    expect(result).toBe("Hello, Seasar! (intercepted)");
    expect(logs).toEqual(["before greet", "after greet"]);
  });

  it("TxInterceptor should commit on success and rollback on error", async () => {
    const db = new MockDatabase();
    const tx = new TxInterceptor(db);

    const service = new SampleService();
    const proxy = applyInterceptors(service, [tx]);

    // 成功ケース
    await proxy.greet("TxUser");
    expect(db.queryLogs).toEqual([
      { sql: "BEGIN TRANSACTION" },
      { sql: "COMMIT" }
    ]);

    // 失敗ケース (ロールバック)
    db.queryLogs = [];
    await expect(proxy.failMethod()).rejects.toThrow("Something broke");
    expect(db.queryLogs).toEqual([
      { sql: "BEGIN TRANSACTION" },
      { sql: "ROLLBACK" }
    ]);
  });

  it("LogInterceptor should log method execution lifecycle", async () => {
    const logs: string[] = [];
    const logger = (msg: string) => logs.push(msg);
    const logInterceptor = new LogInterceptor({ logger });

    const service = new SampleService();
    const proxy = applyInterceptors(service, [logInterceptor]);

    await proxy.greet("Alice");
    expect(logs.length).toBe(2);
    expect(logs[0]).toContain("BEGIN SampleService#greet");
    expect(logs[1]).toContain("END SampleService#greet");
  });
});
