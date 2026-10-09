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
exports.autoBind = autoBind;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 指定ディレクトリ配下のクラスを走査し、クラス名トークンおよびクラス参照自身でコンテナに自動登録する
 * Seasar2 の「命名規約による自動バインディング」を実現
 */
function autoBind(container, options) {
    const { baseDir, scope = "Singleton", recursive = true } = options;
    const boundNames = [];
    if (!fs.existsSync(baseDir)) {
        return boundNames;
    }
    function scan(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory() && recursive) {
                scan(fullPath);
            }
            else if (entry.isFile() &&
                (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
                !entry.name.endsWith(".d.ts") &&
                !entry.name.endsWith(".test.ts") &&
                !entry.name.endsWith(".spec.ts")) {
                try {
                    const mod = require(path.resolve(fullPath));
                    for (const key of Object.keys(mod)) {
                        const target = mod[key];
                        // クラス (関数かつprototypeを持つもの) を対象とする
                        if (typeof target === "function" && target.prototype && target.name) {
                            const componentName = key;
                            // 文字列トークンでの登録
                            if (!container.isBound(componentName)) {
                                const binding = container.bind(componentName).to(target);
                                if (scope === "Singleton")
                                    binding.inSingletonScope();
                                else if (scope === "Transient")
                                    binding.inTransientScope();
                                boundNames.push(componentName);
                            }
                            // クラス自身での登録
                            if (!container.isBound(target)) {
                                const binding = container.bind(target).to(target);
                                if (scope === "Singleton")
                                    binding.inSingletonScope();
                                else if (scope === "Transient")
                                    binding.inTransientScope();
                            }
                        }
                    }
                }
                catch (e) {
                    // モジュールロードエラー時のログ
                    console.warn(`[autoBind] Failed to load module ${fullPath}:`, e);
                }
            }
        }
    }
    scan(baseDir);
    return boundNames;
}
//# sourceMappingURL=autoBind.js.map