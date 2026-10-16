import { describe, it, expect } from "vitest";
import { applyPointcutAdvisors, PointcutAdvisor, matchesPointcut } from "../src/aop/pointcut";
import { Interceptor, MethodInvocation } from "../src/aop/interceptor";

describe("Pointcut & Selective Proxy AOP", () => {
  it("matchesPointcut should match wildcards correctly", () => {
    // メソッドワイルドカード
    expect(matchesPointcut({ methodPattern: "get.*" }, "UserService", "getUser")).toBe(true);
    expect(matchesPointcut({ methodPattern: "get.*" }, "UserService", "saveUser")).toBe(false);

    // クラス名ワイルドカード
    expect(matchesPointcut({ classPattern: "*Service", methodPattern: ".*" }, "UserService", "anyMethod")).toBe(true);
    expect(matchesPointcut({ classPattern: "*Dao", methodPattern: ".*" }, "UserService", "anyMethod")).toBe(false);
  });

  it("applyPointcutAdvisors should apply interceptor only to matching methods", async () => {
    const interceptedLogs: string[] = [];

    const countingInterceptor: Interceptor = {
      async invoke(invocation: MethodInvocation) {
        interceptedLogs.push(`intercepted:${String(invocation.method)}`);
        return await invocation.proceed();
      }
    };

    const advisors: PointcutAdvisor[] = [
      {
        pointcut: { methodPattern: "update.*" },
        interceptor: countingInterceptor
      }
    ];

    class AccountService {
      async getBalance(): Promise<number> {
        return 1000;
      }

      async updateBalance(amount: number): Promise<number> {
        return amount;
      }
    }

    const service = new AccountService();
    const proxy = applyPointcutAdvisors(service, "AccountService", advisors);

    // 1. getBalance (ポイントカットにマッチしない) -> Interceptor 発火しない
    const balance = await proxy.getBalance();
    expect(balance).toBe(1000);
    expect(interceptedLogs).toEqual([]);

    // 2. updateBalance (ポイントカット update.* にマッチ) -> Interceptor 発火する
    const updated = await proxy.updateBalance(500);
    expect(updated).toBe(500);
    expect(interceptedLogs).toEqual(["intercepted:updateBalance"]);
  });
});
