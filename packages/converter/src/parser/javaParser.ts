import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { SeasarClassIR, ComponentLayer, SeasarFieldIR, SeasarMethodIR } from "../ir/seasarIR";

export interface ParseOptions {
  jarPath?: string;
}

/**
 * Java ソースコードから SeasarClassIR を抽出するパーサー
 * JavaParser CLI (JAR) が指定/存在する場合はそれを実行し、
 * なければ標準の精密正規表現/トークンアナライザーで構文解析を行う
 */
export class SeasarJavaParser {
  private jarPath?: string;

  constructor(options?: ParseOptions) {
    this.jarPath = options?.jarPath;
  }

  /**
   * Java ファイル単体を解析して SeasarClassIR を返す
   */
  parseFile(filePath: string): SeasarClassIR {
    const code = fs.readFileSync(filePath, "utf-8");
    return this.parseSource(code, filePath);
  }

  /**
   * Java ソースコード文字列を解析して SeasarClassIR を構築する
   */
  parseSource(source: string, filePath: string = "Unknown.java"): SeasarClassIR {
    // 外部 JAR が利用可能な場合は JavaParser CLI を実行
    if (this.jarPath && fs.existsSync(this.jarPath)) {
      try {
        const output = execSync(`java -jar "${this.jarPath}" "${filePath}"`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"]
        });
        return JSON.parse(output);
      } catch (e) {
        // フォールバック
        console.warn(`[SeasarJavaParser] JavaParser CLI failed, falling back to builtin parser:`, e);
      }
    }

    return this.parseWithBuiltinAnalyzer(source, filePath);
  }

  /**
   * 内蔵アナライザーによる Java クラス・アノテーション・メソッドの抽出
   */
  private parseWithBuiltinAnalyzer(source: string, filePath: string): SeasarClassIR {
    // 1. パッケージ名
    const packageMatch = source.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
    const packageName = packageMatch ? packageMatch[1] : "";

    // 2. クラス名またはインタフェース名
    const classMatch = source.match(
      /(?:public\s+|abstract\s+|final\s+)*(class|interface)\s+([a-zA-Z0-9_]+)/
    );
    const isInterface = classMatch ? classMatch[1] === "interface" : false;
    const className = classMatch ? classMatch[2] : path.basename(filePath, ".java");

    // 3. レイヤー判定 (命名規約 & パッケージ)
    const layer = this.determineLayer(className, packageName);

    // 4. クラスアノテーション
    const annotations: string[] = [];
    const classAnnotationMatches = source.match(/@([a-zA-Z0-9_]+)(?:\([^)]*\))?\s*(?:public|class|interface)/g);
    if (classAnnotationMatches) {
      for (const m of classAnnotationMatches) {
        const name = m.replace(/@([a-zA-Z0-9_]+).*/, "$1");
        annotations.push(name);
      }
    }

    // 5. フィールド抽出
    const fields = this.extractFields(source);

    // 6. メソッド抽出
    const methods = this.extractMethods(source);

    return {
      packageName,
      className,
      isInterface,
      layer,
      annotations,
      fields,
      methods,
      sourceFilePath: filePath
    };
  }

  private determineLayer(className: string, packageName: string): ComponentLayer {
    const lowerName = className.toLowerCase();
    const lowerPkg = packageName.toLowerCase();

    if (lowerName.endsWith("action") || lowerPkg.includes(".action")) return "action";
    if (lowerName.endsWith("logic") || lowerName.endsWith("service") || lowerPkg.includes(".logic") || lowerPkg.includes(".service")) return "logic";
    if (lowerName.endsWith("dao") || lowerPkg.includes(".dao")) return "dao";
    if (lowerPkg.includes(".entity") || lowerPkg.includes(".dto") || lowerPkg.includes(".bean")) return "entity";
    return "other";
  }

  private extractFields(source: string): SeasarFieldIR[] {
    const fields: SeasarFieldIR[] = [];
    // コメント除去
    const cleaned = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

    // フィールド宣言をマッチ (例: @Binding private UserDao userDao; や public int id;)
    const fieldRegex = /(?:(@[a-zA-Z0-9_]+(?:\([^)]*\))?\s+)*)(public|protected|private)\s+([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = fieldRegex.exec(cleaned)) !== null) {
      const annotationPart = match[1] || "";
      const visibility = match[2] as "public" | "protected" | "private";
      const type = match[3].trim();
      const name = match[4].trim();

      const isBinding = annotationPart.includes("@Binding") || annotationPart.includes("@Inject") || annotationPart.includes("@Autowired");

      fields.push({
        name,
        type,
        visibility,
        isBinding
      });
    }

    return fields;
  }

  private extractMethods(source: string): SeasarMethodIR[] {
    const methods: SeasarMethodIR[] = [];

    // メソッド宣言をマッチ (Interface メソッド または Class メソッド)
    // 例: @Sql("find.sql") User find(int id);
    // 例: public User find(int id) { ... }
    const methodRegex = /(?:((?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)+)\s*)?(?:public\s+|protected\s+|private\s+)?([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?(?:\{|;)/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(source)) !== null) {
      const annotationPart = match[1] || "";
      let returnType = match[2].trim()
        .replace(/^(?:public|protected|private|static|final|abstract|synchronized)\s+/g, "")
        .trim();
      const name = match[3].trim();
      const paramStr = match[4].trim();

      // コンストラクタや無効なキーワードを除外
      if (returnType.includes("class") || returnType.includes("interface") || name === "if" || name === "while" || name === "for") {
        continue;
      }

      // @Sql("...") の抽出
      let sqlFile: string | undefined;
      const sqlMatch = annotationPart.match(/@Sql\s*\(\s*["']([^"']+)["']\s*\)/);
      if (sqlMatch) {
        sqlFile = sqlMatch[1];
      }

      // @Transactional の抽出
      const isTransactional = annotationPart.includes("@Transactional") || annotationPart.includes("@Aspect");

      // アノテーションリスト
      const annotations = (annotationPart.match(/@([a-zA-Z0-9_]+)/g) || []).map(a => a.substring(1));

      // パラメータ解析
      const parameters: { name: string; type: string }[] = [];
      if (paramStr.length > 0) {
        const rawParams = paramStr.split(",");
        for (const raw of rawParams) {
          const parts = raw.trim().split(/\s+/);
          if (parts.length >= 2) {
            parameters.push({
              type: parts[parts.length - 2],
              name: parts[parts.length - 1]
            });
          }
        }
      }

      methods.push({
        name,
        returnType,
        parameters,
        sqlFile,
        isTransactional,
        annotations
      });
    }

    return methods;
  }
}
