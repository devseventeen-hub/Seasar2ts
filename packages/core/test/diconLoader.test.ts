import { describe, it, expect } from "vitest";
import { DiconLoader } from "../src/dicon/diconLoader";
import { Interceptor, MethodInvocation } from "../src/aop/interceptor";

class TestUserDao {
  findUser(id: number) {
    return { id, name: `User_${id}` };
  }
}

class TestUserService {
  public initialized = false;
  public initArg = "";
  public disposed = false;
  public maxRetry = 0;

  constructor(public dao: TestUserDao) {}

  init(msg?: string) {
    this.initialized = true;
    if (msg) this.initArg = msg;
  }

  dispose() {
    this.disposed = true;
  }

  getUser(id: number) {
    return this.dao.findUser(id);
  }

  updateUser(id: number) {
    return `Updated_${id}`;
  }
}

class TestLogInterceptor implements Interceptor {
  public logCalls: string[] = [];

  async invoke(invocation: MethodInvocation) {
    this.logCalls.push(String(invocation.method));
    return await invocation.proceed();
  }
}

describe("DiconLoader (Phase 3)", () => {
  it("should dynamically configure container from XML and execute initMethod", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="app">
      <component name="userDao" class="com.example.TestUserDao"/>
      <component name="userService" class="com.example.TestUserService" instance="singleton">
        <arg>#userDao</arg>
        <property name="maxRetry">5</property>
        <initMethod name="init">
          <arg>"READY"</arg>
        </initMethod>
        <destroyMethod name="dispose"/>
      </component>
    </components>`;

    const loader = new DiconLoader();
    loader.registerClass("com.example.TestUserDao", TestUserDao);
    loader.registerClass("com.example.TestUserService", TestUserService);

    const container = loader.loadContent(xml);

    expect(container.isBound("userDao")).toBe(true);
    expect(container.isBound("userService")).toBe(true);

    const service = container.get<TestUserService>("userService");
    expect(service).toBeInstanceOf(TestUserService);
    expect(service.dao).toBeInstanceOf(TestUserDao);
    expect(service.maxRetry).toBe(5);
    // Verified initMethod executed
    expect(service.initialized).toBe(true);
    expect(service.initArg).toBe("READY");

    const user = service.getUser(42);
    expect(user).toEqual({ id: 42, name: "User_42" });
  });

  it("should apply aspect advisors with pointcuts dynamically", async () => {
    const logInterceptor = new TestLogInterceptor();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components>
      <component name="userDao" class="com.example.TestUserDao"/>
      <component name="userService" class="com.example.TestUserService">
        <arg>#userDao</arg>
        <aspect pointcut="update.*">logInterceptor</aspect>
      </component>
    </components>`;

    const loader = new DiconLoader();
    loader.getContainer().bind("logInterceptor").toConstantValue(logInterceptor);
    loader.registerClasses({
      "com.example.TestUserDao": TestUserDao,
      "com.example.TestUserService": TestUserService
    });

    const container = loader.loadContent(xml);
    const service = container.get<TestUserService>("userService");

    // Calling non-matching method
    service.getUser(1);
    expect(logInterceptor.logCalls).not.toContain("getUser");

    // Calling matching method
    const res = await service.updateUser(99);
    expect(res).toBe("Updated_99");
    expect(logInterceptor.logCalls).toContain("updateUser");
  });

  it("should respect prototype scope", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components>
      <component name="counter" instance="prototype">
        <property name="count">0</property>
      </component>
    </components>`;

    const loader = new DiconLoader();
    const container = loader.loadContent(xml);

    const c1 = container.get<any>("counter");
    const c2 = container.get<any>("counter");

    expect(c1).not.toBe(c2);
    c1.count = 10;
    expect(c2.count).toBe(0);
  });
});
