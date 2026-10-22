import { describe, it, expect } from "vitest";
import { SeasarJavaParser } from "../src/parser/javaParser";
import { SeasarTsGenerator } from "../src/generator/tsGenerator";

describe("Seasar2ts Converter (Java -> TS)", () => {
  const parser = new SeasarJavaParser();
  const generator = new SeasarTsGenerator();

  it("should parse POJO Bean and generate TypeScript class", () => {
    const javaSource = `
    package com.example.entity;

    public class User {
        public int id;
        public String name;
        public Date createdAt;
    }
    `;

    const ir = parser.parseSource(javaSource, "User.java");
    expect(ir.className).toBe("User");
    expect(ir.layer).toBe("entity");
    expect(ir.fields.length).toBe(3);
    expect(ir.fields[0].name).toBe("id");
    expect(ir.fields[0].type).toBe("int");

    const tsCode = generator.generateEntityCode(ir);
    expect(tsCode).toContain("export class User {");
    expect(tsCode).toContain("id!: number;");
    expect(tsCode).toContain("name!: string;");
    expect(tsCode).toContain("createdAt!: Date;");
  });

  it("should parse Dao Interface and generate injectable TS concrete class", () => {
    const javaSource = `
    package com.example.dao;

    public interface UserDao {
        @Sql("user/find.sql")
        User find(int id);

        @Sql("user/update.sql")
        int update(User user);
    }
    `;

    const ir = parser.parseSource(javaSource, "UserDao.java");
    expect(ir.className).toBe("UserDao");
    expect(ir.layer).toBe("dao");
    expect(ir.isInterface).toBe(true);
    expect(ir.methods.length).toBe(2);
    expect(ir.methods[0].name).toBe("find");
    expect(ir.methods[0].sqlFile).toBe("user/find.sql");

    const tsCode = generator.generateDaoCode(ir);
    expect(tsCode).toContain("@injectable()");
    expect(tsCode).toContain("export class UserDao {");
    expect(tsCode).toContain("@inject(\"Database\") private db: Database");
    expect(tsCode).toContain("executeAutoOrFileQuery");
    expect(tsCode).toContain("sqlRelativePath: \"user/find.sql\"");
    expect(tsCode).toContain("sqlRelativePath: \"user/update.sql\"");
  });

  it("should generate auto-query code when no @Sql is specified", () => {
    const javaSource = `
    package com.example.dao;

    public interface ItemDao {
        Item selectById(int id);
        List<Item> selectByExample(Item condition);
    }
    `;

    const ir = parser.parseSource(javaSource, "ItemDao.java");
    const tsCode = generator.generateDaoCode(ir);
    expect(tsCode).toContain("export class ItemDao {");
    expect(tsCode).toContain("methodName: \"selectById\"");
    expect(tsCode).toContain("methodName: \"selectByExample\"");
  });

  it("should parse Logic with @Binding and convert to Constructor Injection", () => {
    const javaSource = `
    package com.example.logic;

    @Component
    public class UserService {
        @Binding
        private UserDao userDao;

        public User getUser(int id) {
            return userDao.find(id);
        }
    }
    `;

    const ir = parser.parseSource(javaSource, "UserService.java");
    expect(ir.className).toBe("UserService");
    expect(ir.layer).toBe("logic");
    expect(ir.fields.length).toBe(1);
    expect(ir.fields[0].name).toBe("userDao");
    expect(ir.fields[0].type).toBe("UserDao");
    expect(ir.fields[0].isBinding).toBe(true);

    const tsCode = generator.generateServiceCode(ir);
    expect(tsCode).toContain("@injectable()");
    expect(tsCode).toContain("export class UserService {");
    expect(tsCode).toContain("@inject(\"UserDao\") private userDao: UserDao");
  });

  it("should generate container bootstrap with PostgresDriver when configured", () => {
    const bootstrap = generator.generateContainerBootstrap({
      dbConfig: {
        dbType: "postgresql",
        host: "pg.example.com",
        port: 5432,
        database: "mydb",
        user: "pguser",
        password: "pgpassword"
      }
    });

    expect(bootstrap).toContain("PostgresDriver");
    expect(bootstrap).toContain("new PostgresDriver({");
    expect(bootstrap).toContain("pg.example.com");
    expect(bootstrap).toContain("mydb");
    expect(bootstrap).toContain("pguser");
    expect(bootstrap).toContain("rootContainer.bind<Database>(\"Database\").toConstantValue(db);");
  });

  it("should generate container bootstrap with SQLiteDriver when configured", () => {
    const bootstrap = generator.generateContainerBootstrap({
      dbConfig: {
        dbType: "sqlite",
        database: "sample.db"
      }
    });

    expect(bootstrap).toContain("SQLiteDriver");
    expect(bootstrap).toContain("new SQLiteDriver({");
    expect(bootstrap).toContain("sample.db");
  });
});
