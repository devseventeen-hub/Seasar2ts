import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { parseDiconContent } from "@seasar2ts/core";
import { DiconTsGenerator } from "../src/generator/diconGenerator";

describe("DiconTsGenerator (Phase 2)", () => {
  it("should generate TypeScript container configuration code from DiconDefinition", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE components PUBLIC "-//SEASAR//DTD S2Container//EN"
      "http://www.seasar.org/dtd/components.dtd">
    <components namespace="app">
      <include path="dao.dicon"/>

      <component name="txInterceptor" class="com.example.TxInterceptor"/>

      <component name="userDao" class="com.example.UserDao"/>

      <component name="userService" class="com.example.UserService" instance="prototype">
        <arg index="0">#userDao</arg>
        <property name="maxRetry">3</property>
        <property name="retryDelay">1000</property>
        <aspect pointcut=".*Tx">txInterceptor</aspect>
        <initMethod name="init"/>
        <destroyMethod name="dispose"/>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml, "app.dicon");
    const generator = new DiconTsGenerator();
    const code = generator.generate(dicon, {
      declareMissingClasses: true,
      classImports: {
        "com.example.UserDao": "./dao/UserDao"
      }
    });

    // Verify code contents
    expect(code).toContain("import { S2HierarchicalContainer, applyPointcutAdvisors, PointcutAdvisor } from \"@seasar2ts/core\";");
    expect(code).toContain("import { configureDaoContainer } from \"./dao.dicon\";");
    expect(code).toContain("import { UserDao } from \"./dao/UserDao\";");
    expect(code).toContain("declare const TxInterceptor: any;");
    expect(code).toContain("declare const UserService: any;");

    expect(code).toContain("export function configureAppContainer(container: S2HierarchicalContainer): void");
    expect(code).toContain("configureDaoContainer(container);");

    // userDao binding
    expect(code).toContain('container.bind("userDao").to(UserDao).inSingletonScope();');

    // userService dynamic binding
    expect(code).toContain('container.bind("userService").toDynamicValue((context) => {');
    expect(code).toContain('const instance = new UserService(context.container.get("userDao"));');
    expect(code).toContain("instance.maxRetry = 3;");
    expect(code).toContain("instance.retryDelay = 1000;");
    expect(code).toContain("instance.init();");
    expect(code).toContain("}).inTransientScope()");

    // aspect advisor
    expect(code).toContain(".onActivation((context, instance: any) => {");
    expect(code).toContain("pointcut: { methodPattern: /.*Tx/ }");
    expect(code).toContain('interceptor: context.container.get("txInterceptor")');

    // destroyMethod
    expect(code).toContain(".onDeactivation((instance: any) => {");
    expect(code).toContain("instance.dispose();");

    // Verify generated code is syntactically valid TypeScript
    const transpileResult = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
      }
    });
    expect(transpileResult.outputText).toBeDefined();
    expect(transpileResult.diagnostics?.length ?? 0).toBe(0);
  });

  it("should handle request scope and components without class or aspects", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="web">
      <component name="requestContext" instance="request">
        <property name="requestId">"req-12345"</property>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml, "web.dicon");
    const generator = new DiconTsGenerator();
    const code = generator.generate(dicon);

    expect(code).toContain("export function configureWebContainer(container: S2HierarchicalContainer): void");
    expect(code).toContain('container.bind("requestContext").toDynamicValue');
    expect(code).toContain('instance.requestId = "req-12345";');
    expect(code).toContain(".inRequestScope();");

    const transpileResult = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    expect(transpileResult.outputText).toBeDefined();
  });
});
