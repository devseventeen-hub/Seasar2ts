"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasarJavaParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * Java ソースコードから SeasarClassIR を抽出するパーサー
 * JavaParser CLI (JAR) が指定/存在する場合はそれを実行し、
 * なければ標準の精密正規表現/トークンアナライザーで構文解析を行う
 */
class SeasarJavaParser {
    jarPath;
    constructor(options) {
        this.jarPath = options?.jarPath;
    }
    /**
     * Java ファイル単体を解析して SeasarClassIR を返す
     */
    parseFile(filePath) {
        const code = fs.readFileSync(filePath, "utf-8");
        return this.parseSource(code, filePath);
    }
    /**
     * Java ソースコード文字列を解析して SeasarClassIR を構築する
     */
    parseSource(source, filePath = "Unknown.java") {
        // 外部 JAR が利用可能な場合は JavaParser CLI を実行
        if (this.jarPath && fs.existsSync(this.jarPath)) {
            try {
                const output = (0, child_process_1.execSync)(`java -jar "${this.jarPath}" "${filePath}"`, {
                    encoding: "utf-8",
                    stdio: ["pipe", "pipe", "ignore"]
                });
                return JSON.parse(output);
            }
            catch (e) {
                // フォールバック
                console.warn(`[SeasarJavaParser] JavaParser CLI failed, falling back to builtin parser:`, e);
            }
        }
        return this.parseWithBuiltinAnalyzer(source, filePath);
    }
    /**
     * 内蔵アナライザーによる Java クラス・アノテーション・メソッドの抽出
     */
    parseWithBuiltinAnalyzer(source, filePath) {
        // 1. パッケージ名
        const packageMatch = source.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
        const packageName = packageMatch ? packageMatch[1] : "";
        // 2. クラス名またはインタフェース名
        const classMatch = source.match(/(?:public\s+|abstract\s+|final\s+)*(class|interface)\s+([a-zA-Z0-9_]+)/);
        const isInterface = classMatch ? classMatch[1] === "interface" : false;
        const className = classMatch ? classMatch[2] : path.basename(filePath, ".java");
        // 3. レイヤー判定 (命名規約 & パッケージ)
        const layer = this.determineLayer(className, packageName);
        // 4. クラスアノテーション
        const annotations = [];
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
    determineLayer(className, packageName) {
        const lowerName = className.toLowerCase();
        const lowerPkg = packageName.toLowerCase();
        if (lowerName.endsWith("action") || lowerPkg.includes(".action"))
            return "action";
        if (lowerName.endsWith("logic") || lowerName.endsWith("service") || lowerPkg.includes(".logic") || lowerPkg.includes(".service"))
            return "logic";
        if (lowerName.endsWith("dao") || lowerPkg.includes(".dao"))
            return "dao";
        if (lowerPkg.includes(".entity") || lowerPkg.includes(".dto") || lowerPkg.includes(".bean"))
            return "entity";
        return "other";
    }
    extractFields(source) {
        const fields = [];
        // コメント除去
        const cleaned = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
        // フィールド宣言をマッチ (例: @Binding private UserDao userDao; や public int id;)
        const fieldRegex = /(?:(@[a-zA-Z0-9_]+(?:\([^)]*\))?\s+)*)(public|protected|private)\s+([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*;/g;
        let match;
        while ((match = fieldRegex.exec(cleaned)) !== null) {
            const annotationPart = match[1] || "";
            const visibility = match[2];
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
    extractMethods(source) {
        const methods = [];
        // メソッド宣言をマッチ (Interface メソッド または Class メソッド)
        // 例: @Sql("find.sql") User find(int id);
        // 例: public User find(int id) { ... }
        const methodRegex = /(?:((?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)+)\s*)?(?:public\s+|protected\s+|private\s+)?([a-zA-Z0-9_<>,?\s]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?(?:\{|;)/g;
        let match;
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
            let sqlFile;
            const sqlMatch = annotationPart.match(/@Sql\s*\(\s*["']([^"']+)["']\s*\)/);
            if (sqlMatch) {
                sqlFile = sqlMatch[1];
            }
            // @Transactional の抽出
            const isTransactional = annotationPart.includes("@Transactional") || annotationPart.includes("@Aspect");
            // アノテーションリスト
            const annotations = (annotationPart.match(/@([a-zA-Z0-9_]+)/g) || []).map(a => a.substring(1));
            // パラメータ解析
            const parameters = [];
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
exports.SeasarJavaParser = SeasarJavaParser;
//# sourceMappingURL=javaParser.js.map