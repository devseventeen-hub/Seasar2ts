import { describe, it, expect } from "vitest";
import { createContainer } from "../src/container/container";
import { autoBind } from "../src/container/autoBind";
import { injectable, inject } from "inversify";
import * as fs from "fs";
import * as path from "path";

describe("Container & autoBind Engine", () => {
  it("createContainer should support singleton bindings", () => {
    const container = createContainer();

    @injectable()
    class ConfigService {
      public version = "1.0.0";
    }

    container.bind("ConfigService").to(ConfigService);
    const instance1 = container.get<ConfigService>("ConfigService");
    const instance2 = container.get<ConfigService>("ConfigService");

    expect(instance1).toBe(instance2);
    expect(instance1.version).toBe("1.0.0");
  });

  it("autoBind should scan directory and bind classes by convention", () => {
    const container = createContainer();
    const fixtureDir = path.join(__dirname, "fixtures");
    if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

    // テスト用モジュールファイルを一時作成
    const sampleModPath = path.join(fixtureDir, "SampleLogic.ts");
    fs.writeFileSync(
      sampleModPath,
      `
      export class SampleLogic {
        execute() { return "logic executed"; }
      }
      `
    );

    const boundNames = autoBind(container, { baseDir: fixtureDir });
    expect(boundNames).toContain("SampleLogic");

    const logicInstance = container.get<any>("SampleLogic");
    expect(logicInstance).toBeDefined();
    expect(logicInstance.execute()).toBe("logic executed");

    // クリーンアップ
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });
});
