import { describe, it, expect } from "vitest";
import { DocGenerator } from "../src/generator/docGenerator";
import { SeasarClassIR } from "../src/ir/seasarIR";

describe("DocGenerator (Phase 4)", () => {
  const docGenerator = new DocGenerator();

  const mockClasses: SeasarClassIR[] = [
    {
      packageName: "com.example.action",
      className: "UserAction",
      isInterface: false,
      layer: "action",
      docComment: "ユーザー情報管理のアクションコントローラー",
      annotations: ["Component"],
      fields: [
        {
          name: "userService",
          type: "UserService",
          isBinding: true,
          visibility: "private"
        },
        {
          name: "userForm",
          type: "UserForm",
          isBinding: false,
          visibility: "public",
          docComment: "入力用フォーム"
        }
      ],
      methods: [
        {
          name: "index",
          returnType: "String",
          parameters: [],
          annotations: [],
          docComment: "ユーザー一覧初期表示",
          httpMethod: "GET",
          routePath: "/user/index"
        },
        {
          name: "submit",
          returnType: "String",
          parameters: [
            { name: "form", type: "UserForm", docComment: "登録フォームデータ" }
          ],
          annotations: [],
          docComment: "ユーザー新規登録を実行",
          httpMethod: "POST",
          routePath: "/user/submit"
        }
      ]
    },
    {
      packageName: "com.example.form",
      className: "UserForm",
      isInterface: false,
      layer: "form",
      docComment: "ユーザー画面入力フォーム",
      annotations: [],
      fields: [
        {
          name: "name",
          type: "String",
          isBinding: false,
          visibility: "public",
          docComment: "ユーザー氏名 (必須)"
        },
        {
          name: "email",
          type: "String",
          isBinding: false,
          visibility: "public",
          docComment: "メールアドレス (必須)"
        },
        {
          name: "age",
          type: "int",
          isBinding: false,
          visibility: "public",
          docComment: "年齢"
        }
      ],
      methods: []
    }
  ];

  it("should generate human & AI-readable api-catalog.md", () => {
    const md = docGenerator.generateApiCatalogMarkdown(mockClasses);

    // Document header
    expect(md).toContain("# Application API & Type Catalog");
    expect(md).toContain("Generated automatically by **Seasar2ts Converter**");

    // Summary table
    expect(md).toContain("## 1. Action Endpoints Summary");
    expect(md).toContain("| `GET` | `/user/index` | `UserAction` | `index` | ユーザー一覧初期表示 |");
    expect(md).toContain("| `POST` | `/user/submit` | `UserAction` | `submit` | ユーザー新規登録を実行 |");

    // Action details
    expect(md).toContain("## 2. Action Details");
    expect(md).toContain("### `UserAction`");
    expect(md).toContain("ユーザー情報管理のアクションコントローラー");
    expect(md).toContain("- **Dependencies**: `UserService`");
    expect(md).toContain("#### `GET /user/index`");
    expect(md).toContain("- **Parameters**: (None)");
    expect(md).toContain("- **Return Type**: `Promise<ActionResult>`");

    expect(md).toContain("#### `POST /user/submit`");
    expect(md).toContain("- `form`: `UserForm` - 登録フォームデータ");

    // Data models & forms
    expect(md).toContain("## 3. Data Models & Forms");
    expect(md).toContain("### `UserForm` (FORM)");
    expect(md).toContain("> ユーザー画面入力フォーム");
    expect(md).toContain("| `name` | `string` | ユーザー氏名 (必須) |");
    expect(md).toContain("| `email` | `string` | メールアドレス (必須) |");
    expect(md).toContain("| `age` | `number` | 年齢 |");
  });

  it("should generate valid OpenAPI 3.0 compatible JSON api-spec.json", () => {
    const jsonStr = docGenerator.generateApiSpecJson(mockClasses);
    const spec = JSON.parse(jsonStr);

    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.title).toBe("Application API Specification");

    // Paths
    expect(spec.paths["/user/index"]).toBeDefined();
    expect(spec.paths["/user/index"].get).toBeDefined();
    expect(spec.paths["/user/index"].get.summary).toBe("ユーザー一覧初期表示");

    expect(spec.paths["/user/submit"]).toBeDefined();
    expect(spec.paths["/user/submit"].post).toBeDefined();
    expect(spec.paths["/user/submit"].post.summary).toBe("ユーザー新規登録を実行");
    expect(spec.paths["/user/submit"].post.requestBody.content["application/json"]).toBeDefined();

    // Schemas
    expect(spec.components.schemas["UserForm"]).toBeDefined();
    expect(spec.components.schemas["UserForm"].properties.name.type).toBe("string");
    expect(spec.components.schemas["UserForm"].properties.email.type).toBe("string");
    expect(spec.components.schemas["UserForm"].properties.age.type).toBe("number");
  });
});
