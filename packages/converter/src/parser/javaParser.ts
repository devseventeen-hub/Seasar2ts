import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { SeasarClassIR, ComponentLayer, SeasarFieldIR, SeasarMethodIR } from "../ir/seasarIR";

export interface ParseOptions {
  jarPath?: string;
}

/**
 * JavaDoc コメント文字列（/** ... *\/）をクリーンなテキストに整形する
 */
export function cleanDocComment(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/^\/\*\*|\*\/$/g, "")
    .split("\n")
    .map(line => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line, i, arr) => !(i === 0 && line === "") && !(i === arr.length - 1 && line === ""))
    .join("\n")
    .trim();
  return cleaned || undefined;
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

    // 4. クラスレベル JavaDoc コメントの抽出
    const classDocMatch = source.match(
      /(\/\*\*([^*]|\*(?!\/))*?\*\/)\s*(?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)*(?:public\s+|abstract\s+|final\s+)*(?:class|interface)\s+[a-zA-Z0-9_]+/
    );
    const docComment = classDocMatch ? cleanDocComment(classDocMatch[1]) : undefined;

    // 5. クラスアノテーション
    const annotations: string[] = [];
    const classAnnotationMatches = source.match(/@([a-zA-Z0-9_]+)(?:\([^)]*\))?\s*(?:public|class|interface)/g);
    if (classAnnotationMatches) {
      for (const m of classAnnotationMatches) {
        const name = m.replace(/@([a-zA-Z0-9_]+).*/, "$1");
        annotations.push(name);
      }
    }

    // 6. フィールド抽出
    const fields = this.extractFields(source);

    // 7. メソッド抽出
    const methods = this.extractMethods(source, className, layer);

    return {
      packageName,
      className,
      isInterface,
      layer,
      annotations,
      fields,
      methods,
      docComment,
      sourceFilePath: filePath
    };
  }

  private determineLayer(className: string, packageName: string): ComponentLayer {
    const lowerName = className.toLowerCase();
    const lowerPkg = packageName.toLowerCase();

    if (lowerName.endsWith("action") || lowerPkg.includes(".action")) return "action";
    if (lowerName.endsWith("form") || lowerPkg.includes(".form")) return "form";
    if (lowerName.endsWith("dto") || lowerPkg.includes(".dto")) return "dto";
    if (lowerName.endsWith("logic") || lowerName.endsWith("service") || lowerPkg.includes(".logic") || lowerPkg.includes(".service")) return "logic";
    if (lowerName.endsWith("dao") || lowerPkg.includes(".dao")) return "dao";
    if (lowerPkg.includes(".entity") || lowerPkg.includes(".bean")) return "entity";
    return "other";
  }

  private extractFields(source: string): SeasarFieldIR[] {
    const fields: SeasarFieldIR[] = [];

    // フィールド宣言をマッチ (JavaDoc, アノテーション, 修飾子, 型, 名前)
    const fieldRegex = /(?:(\/\*\*([^*]|\*(?!\/))*?\*\/)\s*)?(?:((?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)+)\s*)?(public|protected|private)\s+([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = fieldRegex.exec(source)) !== null) {
      const rawDoc = match[1];
      const annotationPart = match[3] || "";
      const visibility = match[4] as "public" | "protected" | "private";
      const type = match[5].trim();
      const name = match[6].trim();

      const isBinding = annotationPart.includes("@Binding") || annotationPart.includes("@Inject") || annotationPart.includes("@Autowired");
      const docComment = cleanDocComment(rawDoc);

      fields.push({
        name,
        type,
        visibility,
        isBinding,
        docComment
      });
    }

    return fields;
  }

  private extractMethods(source: string, className: string, layer: ComponentLayer): SeasarMethodIR[] {
    const methods: SeasarMethodIR[] = [];

    // メソッド宣言をマッチ (JavaDoc, アノテーション, 修飾子, 戻り値型, 名前, 引数)
    const methodRegex = /(?:(\/\*\*([^*]|\*(?!\/))*?\*\/)\s*)?(?:((?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)+)\s*)?(?:public\s+|protected\s+|private\s+)?([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?(?:\{|;)/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(source)) !== null) {
      const rawDoc = match[1];
      const annotationPart = match[3] || "";
      let returnType = match[4].trim()
        .replace(/^(?:public|protected|private|static|final|abstract|synchronized)\s+/g, "")
        .trim();
      const name = match[5].trim();
      const paramStr = match[6].trim();

      // コンストラクタや無効な構文を除外
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
      const docComment = cleanDocComment(rawDoc);

      // パラメータ解析
      const parameters: { name: string; type: string; docComment?: string }[] = [];
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

      // Action レイヤーの場合のエンドポイントおよび HTTP メソッドの推定
      let httpMethod: "GET" | "POST" | "ALL" | undefined;
      let routePath: string | undefined;

      if (layer === "action") {
        const baseName = className.replace(/(?:Action|Controller)$/, "").replace(/^[A-Z]/, c => c.toLowerCase());
        routePath = name === "index" ? `/${baseName}` : `/${baseName}/${name}`;

        const lower = name.toLowerCase();
        if (/^(?:submit|insert|update|delete|save|post)/.test(lower)) {
          httpMethod = "POST";
        } else if (/^(?:index|show|find|get|list|display)/.test(lower)) {
          httpMethod = "GET";
        } else {
          httpMethod = "ALL";
        }
      }

      methods.push({
        name,
        returnType,
        parameters,
        sqlFile,
        isTransactional,
        annotations,
        docComment,
        httpMethod,
        routePath
      });
    }

    return methods;
  }
}
