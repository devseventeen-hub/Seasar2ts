"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContainer = createContainer;
require("reflect-metadata");
const inversify_1 = require("inversify");
/**
 * Seasar2 風の標準 DI コンテナを生成する
 * デフォルトで Singleton スコープとし、auto-binding や Interceptor 付与をサポート
 */
function createContainer(options) {
    return new inversify_1.Container({
        defaultScope: "Singleton",
        ...options
    });
}
//# sourceMappingURL=container.js.map