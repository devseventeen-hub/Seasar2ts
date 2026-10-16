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
exports.initContainer = initContainer;
require("reflect-metadata");
const path = __importStar(require("path"));
const core_1 = require("@seasar2ts/core");
function initContainer(dbInstance) {
    // 1. Root コンテナの生成 (共通リソース・DAO層)
    const rootContainer = new core_1.S2HierarchicalContainer("root");
    const db = dbInstance || new core_1.MockDatabase();
    rootContainer.bind("Database").toConstantValue(db);
    // 2. 共通 Interceptor の登録
    const txInterceptor = new core_1.TxInterceptor(db);
    const logInterceptor = new core_1.LogInterceptor();
    rootContainer.bind("TxInterceptor").toConstantValue(txInterceptor);
    rootContainer.bind("LogInterceptor").toConstantValue(logInterceptor);
    const baseDir = __dirname;
    // Root コンテナに DAO を自動登録
    rootContainer.autoBind({ baseDir: path.join(baseDir, "dao") });
    // 3. Web 用子コンテナの生成 (Action / Logic 層)
    const webContainer = rootContainer.createChild("web");
    webContainer.autoBind({ baseDir: path.join(baseDir, "logic") });
    webContainer.autoBind({ baseDir: path.join(baseDir, "action") });
    return rootContainer;
}
//# sourceMappingURL=container.js.map