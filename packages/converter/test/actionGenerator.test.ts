import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { SeasarJavaParser } from "../src/parser/javaParser";
import { ActionTsGenerator } from "../src/generator/actionGenerator";

describe("ActionTsGenerator (Phase 3)", () => {
  const parser = new SeasarJavaParser();
  const generator = new ActionTsGenerator();

  it("should generate Action class with ActionResult return types and TSDoc comments", () => {
    const javaSource = `
    package com.example.action;

    /**
     * ユーザー管理コントローラー
     */
    public class UserAction {
        @Binding
        private UserService userService;

        /** 入力フォーム */
        public UserForm userForm;

        /**
         * ユーザー一覧画面を表示
         */
        public String index() {
            return "userList.jsp";
        }

        /**
         * ユーザー新規登録
         */
        public String submit(UserForm form) {
            return "user/index?redirect=true";
        }
    }
    `;

    const ir = parser.parseSource(javaSource, "UserAction.java");
    const code = generator.generateActionCode(ir);

    expect(code).toContain('import { ActionResult, view, redirect, json } from "@seasar2ts/core";');
    expect(code).toContain('import { UserService } from "../logic/UserService";');
    expect(code).toContain('import { UserForm } from "./UserForm";');
    expect(code).toContain("* ユーザー管理コントローラー");
    expect(code).toContain("@injectable()");
    expect(code).toContain("export class UserAction {");
    expect(code).toContain('@inject("UserService") private userService: UserService');
    expect(code).toContain("public userForm = new UserForm();");
    expect(code).toContain("async index(): Promise<ActionResult> {");
    expect(code).toContain('return view("userList.jsp");');
    expect(code).toContain("async submit(form?: UserForm): Promise<ActionResult> {");
    expect(code).toContain('return redirect("/user/index");');

    // Syntax validation
    const transpileResult = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    expect(transpileResult.outputText).toBeDefined();
    expect(transpileResult.diagnostics?.length ?? 0).toBe(0);
  });

  it("should generate Form class with typed properties and TSDoc comments", () => {
    const javaSource = `
    package com.example.form;

    /**
     * ユーザー登録用フォーム
     */
    public class UserForm {
        /** 氏名 */
        public String name;
        /** メールアドレス */
        public String email;
        /** 年齢 */
        public int age;
    }
    `;

    const ir = parser.parseSource(javaSource, "UserForm.java");
    expect(ir.layer).toBe("form");

    const code = generator.generateFormCode(ir);
    expect(code).toContain("* ユーザー登録用フォーム");
    expect(code).toContain("export class UserForm {");
    expect(code).toContain("* 氏名");
    expect(code).toContain("name!: string;");
    expect(code).toContain("* メールアドレス");
    expect(code).toContain("email!: string;");
    expect(code).toContain("* 年齢");
    expect(code).toContain("age!: number;");

    const transpileResult = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    expect(transpileResult.outputText).toBeDefined();
    expect(transpileResult.diagnostics?.length ?? 0).toBe(0);
  });
});
