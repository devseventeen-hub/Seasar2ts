import { describe, it, expect } from "vitest";
import { parseDiconContent, extractDataSourceConfig } from "../src/dicon/diconParser";

describe("dicon XML Parser", () => {
  it("should parse components, aspects, and includes from dicon xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE components PUBLIC "-//SEASAR//DTD S2Container//EN"
      "http://www.seasar.org/dtd/components.dtd">
    <components>
      <include path="dao.dicon"/>
      <component name="tx" class="org.seasar.extension.tx.RequiredInterceptor"/>
      <component name="userDao" class="com.example.dao.UserDao">
        <aspect>tx</aspect>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    expect(dicon.includes.length).toBe(1);
    expect(dicon.includes[0].path).toBe("dao.dicon");

    expect(dicon.components.length).toBe(2);
    expect(dicon.components[0].name).toBe("tx");
    expect(dicon.components[0].className).toBe("org.seasar.extension.tx.RequiredInterceptor");

    expect(dicon.components[1].name).toBe("userDao");
    expect(dicon.components[1].className).toBe("com.example.dao.UserDao");
    expect(dicon.components[1].aspects).toContain("tx");
  });

  it("should extract PostgreSQL dataSource configuration from jdbc.dicon", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="jdbc">
      <component name="dataSource" class="org.seasar.extension.dbcp.impl.BasicDataSource">
        <property name="driverClassName">"org.postgresql.Driver"</property>
        <property name="URL">"jdbc:postgresql://db.internal:5432/proddb"</property>
        <property name="user">"dbadmin"</property>
        <property name="password">"secret123"</property>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    const ds = extractDataSourceConfig(dicon);

    expect(ds).toBeDefined();
    expect(ds?.dbType).toBe("postgresql");
    expect(ds?.driverClassName).toBe("org.postgresql.Driver");
    expect(ds?.host).toBe("db.internal");
    expect(ds?.port).toBe(5432);
    expect(ds?.database).toBe("proddb");
    expect(ds?.user).toBe("dbadmin");
    expect(ds?.password).toBe("secret123");
  });

  it("should extract SQLite dataSource configuration from jdbc.dicon", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="jdbc">
      <component name="dataSource" class="org.seasar.extension.dbcp.impl.BasicDataSource">
        <property name="driverClassName">"org.sqlite.JDBC"</property>
        <property name="URL">"jdbc:sqlite:test.db"</property>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    const ds = extractDataSourceConfig(dicon);

    expect(ds).toBeDefined();
    expect(ds?.dbType).toBe("sqlite");
    expect(ds?.database).toBe("test.db");
  });
});
