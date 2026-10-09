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
exports.setSqlBaseDir = setSqlBaseDir;
exports.loadSql = loadSql;
exports.clearSqlCache = clearSqlCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sqlCache = new Map();
let sqlBaseDir = process.cwd();
/**
 * SQLファイルを探索するベースディレクトリを設定する
 */
function setSqlBaseDir(dir) {
    sqlBaseDir = dir;
}
/**
 * SQLファイルを読み込み、文字列として返す (キャッシュ付き)
 * @param relativePath SQLファイルの相対パス (例: "user/find.sql" や "sql/user/find.sql")
 */
function loadSql(relativePath) {
    if (sqlCache.has(relativePath)) {
        return sqlCache.get(relativePath);
    }
    // 複数の探索候補（そのまま、または src/sql/ 配下）
    const candidates = [
        path.resolve(sqlBaseDir, relativePath),
        path.resolve(sqlBaseDir, "src/sql", relativePath),
        path.resolve(sqlBaseDir, "sql", relativePath)
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            const content = fs.readFileSync(candidate, "utf-8").trim();
            sqlCache.set(relativePath, content);
            return content;
        }
    }
    throw new Error(`SQL file not found: ${relativePath}. Checked candidates: ${candidates.join(", ")}`);
}
/**
 * テスト用キャッシュクリア
 */
function clearSqlCache() {
    sqlCache.clear();
}
//# sourceMappingURL=loadSql.js.map