import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { runConversion } from "../src/cli";

describe("Converter CLI & Output Hierarchy (Phase 5)", () => {
  const tempBase = path.join(__dirname, "temp-cli-test");
  const inputDir = path.join(tempBase, "input");
  const outputDir = path.join(tempBase, "output");

  afterAll(() => {
    if (fs.existsSync(tempBase)) {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it("should run conversion and create both src/ and docs/ output hierarchies", () => {
    // 準備: テスト入力アセットの配置
    fs.mkdirSync(inputDir, { recursive: true });

    const userActionJava = `
    package com.example.action;

    /**
     * ユーザー管理画面アクション
     */
    public class UserAction {
        public UserForm userForm;

        /**
         * 一覧画面を表示
         */
        public String index() {
            return "userList.jsp";
        }

        /**
         * 新規登録を実行
         */
        public String submit(UserForm form) {
            return "user/index?redirect=true";
        }
    }
    `;
    fs.writeFileSync(path.join(inputDir, "UserAction.java"), userActionJava, "utf-8");

    const userFormJava = `
    package com.example.form;

    /**
     * ユーザー登録フォーム
     */
    public class UserForm {
        /** 氏名 */
        public String name;
        /** 年齢 */
        public int age;
    }
    `;
    fs.writeFileSync(path.join(inputDir, "UserForm.java"), userFormJava, "utf-8");

    const appDicon = `<?xml version="1.0" encoding="UTF-8"?>
    <components namespace="app">
      <component name="userAction" class="com.example.action.UserAction"/>
    </components>`;
    fs.writeFileSync(path.join(inputDir, "app.dicon"), appDicon, "utf-8");

    // 実行
    runConversion(inputDir, outputDir);

    // 検証: src/ 階層
    expect(fs.existsSync(path.join(outputDir, "src", "action", "UserAction.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "src", "action", "UserForm.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "src", "dicon", "app.dicon.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "src", "container.ts"))).toBe(true);

    // 検証: docs/ 階層
    const catalogPath = path.join(outputDir, "docs", "api-catalog.md");
    const specPath = path.join(outputDir, "docs", "api-spec.json");

    expect(fs.existsSync(catalogPath)).toBe(true);
    expect(fs.existsSync(specPath)).toBe(true);

    // 内容確認
    const catalogContent = fs.readFileSync(catalogPath, "utf-8");
    expect(catalogContent).toContain("# Application API & Type Catalog");
    expect(catalogContent).toContain("UserAction");
    expect(catalogContent).toContain("ユーザー管理画面アクション");
    expect(catalogContent).toContain("UserForm");
    expect(catalogContent).toContain("ユーザー登録フォーム");

    const specContent = fs.readFileSync(specPath, "utf-8");
    const parsedSpec = JSON.parse(specContent);
    expect(parsedSpec.openapi).toBe("3.0.3");
    expect(parsedSpec.paths["/user"]).toBeDefined();
    expect(parsedSpec.paths["/user/submit"]).toBeDefined();
    expect(parsedSpec.components.schemas["UserForm"]).toBeDefined();
  });
});
