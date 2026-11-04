import { describe, it, expect } from "vitest";
import { parseDiconContent, extractDataSourceConfig } from "../src/dicon/diconParser";

describe("Dicon Full IR & Parser (Phase 1)", () => {
  it("should parse full dicon elements: args, properties, aspects with pointcuts, init/destroy methods, metas, and scopes", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE components PUBLIC "-//SEASAR//DTD S2Container//EN"
      "http://www.seasar.org/dtd/components.dtd">
    <components namespace="app">
      <meta name="version">"1.0.0"</meta>
      <include path="dao.dicon"/>

      <component name="serviceAdvisor" class="com.example.Advisor"/>

      <component name="userService" class="com.example.UserService" instance="prototype" autoBinding="property">
        <meta name="description">"User business service"</meta>
        <arg index="0">"appConfig"</arg>
        <arg>#serviceAdvisor</arg>
        <property name="maxRetryCount">"5"</property>
        <property name="dao" component="userDao"/>
        <aspect pointcut=".*Tx">serviceAdvisor</aspect>
        <initMethod name="initialize">
          <arg>"initValue"</arg>
        </initMethod>
        <destroyMethod name="dispose"/>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);

    expect(dicon.namespace).toBe("app");
    expect(dicon.metas).toHaveLength(1);
    expect(dicon.metas[0]).toEqual({ name: "version", value: "1.0.0" });

    expect(dicon.includes).toHaveLength(1);
    expect(dicon.includes[0].path).toBe("dao.dicon");

    expect(dicon.components).toHaveLength(2);

    const comp = dicon.components[1];
    expect(comp.name).toBe("userService");
    expect(comp.className).toBe("com.example.UserService");
    expect(comp.instanceScope).toBe("prototype");
    expect(comp.autoBinding).toBe("property");

    // metas
    expect(comp.metas).toHaveLength(1);
    expect(comp.metas[0]).toEqual({ name: "description", value: "User business service" });

    // args
    expect(comp.args).toHaveLength(2);
    expect(comp.args[0]).toEqual({ index: 0, value: "appConfig", componentName: undefined, expression: undefined });
    expect(comp.args[1]).toEqual({ index: undefined, value: undefined, componentName: "serviceAdvisor", expression: undefined });

    // properties
    expect(comp.properties).toHaveLength(2);
    expect(comp.properties[0]).toEqual({ name: "maxRetryCount", value: "5", componentName: undefined, expression: undefined });
    expect(comp.properties[1]).toEqual({ name: "dao", value: undefined, componentName: "userDao", expression: undefined });

    // aspects
    expect(comp.aspectDefs).toHaveLength(1);
    expect(comp.aspectDefs[0]).toEqual({ interceptorName: "serviceAdvisor", pointcut: ".*Tx" });

    // initMethods
    expect(comp.initMethods).toHaveLength(1);
    expect(comp.initMethods[0].methodName).toBe("initialize");
    expect(comp.initMethods[0].args).toHaveLength(1);
    expect(comp.initMethods[0].args[0].value).toBe("initValue");

    // destroyMethods
    expect(comp.destroyMethods).toHaveLength(1);
    expect(comp.destroyMethods[0].methodName).toBe("dispose");
  });

  it("should extract connection pool configuration from DBCP attributes in jdbc.dicon", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="jdbc">
      <component name="dataSource" class="org.seasar.extension.dbcp.impl.BasicDataSource">
        <property name="driverClassName">"org.postgresql.Driver"</property>
        <property name="url">"jdbc:postgresql://postgres.internal:5432/corpdb"</property>
        <property name="user">"dbuser"</property>
        <property name="password">"p@ssword"</property>
        <property name="maxActive">"25"</property>
        <property name="minIdle">"5"</property>
        <property name="maxWait">"5000"</property>
        <property name="maxIdle">"15"</property>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    const ds = extractDataSourceConfig(dicon);

    expect(ds).toBeDefined();
    expect(ds?.dbType).toBe("postgresql");
    expect(ds?.host).toBe("postgres.internal");
    expect(ds?.port).toBe(5432);
    expect(ds?.database).toBe("corpdb");
    expect(ds?.pool).toBeDefined();
    expect(ds?.pool?.max).toBe(25);
    expect(ds?.pool?.min).toBe(5);
    expect(ds?.pool?.acquireTimeoutMillis).toBe(5000);
    expect(ds?.pool?.idleTimeoutMillis).toBe(15000);
  });

  it("should provide default pool settings if DBCP properties are omitted", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="jdbc">
      <component name="dataSource" class="org.seasar.extension.dbcp.impl.BasicDataSource">
        <property name="driverClassName">"com.mysql.cj.jdbc.Driver"</property>
        <property name="url">"jdbc:mysql://localhost:3306/mysqldb"</property>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    const ds = extractDataSourceConfig(dicon);

    expect(ds).toBeDefined();
    expect(ds?.dbType).toBe("mysql");
    expect(ds?.pool?.max).toBe(10);
    expect(ds?.pool?.min).toBe(1);
    expect(ds?.pool?.acquireTimeoutMillis).toBe(10000);
    expect(ds?.pool?.idleTimeoutMillis).toBe(30000);
  });
});
