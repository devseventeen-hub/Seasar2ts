"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2HttpRouter = void 0;
exports.inferActionBasePath = inferActionBasePath;
exports.createHttpHandler = createHttpHandler;
const actionResult_1 = require("./actionResult");
/**
 * キャメルケース・パス名を正規化する (UserAction -> /user, ItemCategoryAction -> /itemCategory)
 */
function inferActionBasePath(actionNameOrClass) {
    const baseName = actionNameOrClass
        .replace(/(?:Action|Controller)$/, "")
        .replace(/^[A-Z]/, c => c.toLowerCase());
    return `/${baseName}`;
}
/**
 * Seasar2 命名規約に基づく Web ルーターおよび汎用 HTTP ディスパッチャ
 */
class S2HttpRouter {
    container;
    routes = [];
    constructor(container) {
        this.container = container;
    }
    /**
     * 明示的にルーティング定義を追加する
     */
    registerRoute(route) {
        this.routes.push(route);
        return this;
    }
    /**
     * Action クラスまたはインスタンスから命名規約に基づいてルーティングを自動登録する
     * 例: UserAction -> /user (index -> GET/POST /user/, submit -> POST /user/submit)
     */
    registerAction(actionToken, actionClassOrPrototype, customBasePath) {
        const className = typeof actionClassOrPrototype === "function"
            ? actionClassOrPrototype.name
            : (actionClassOrPrototype?.constructor?.name || actionToken);
        const basePath = customBasePath || inferActionBasePath(className);
        const proto = typeof actionClassOrPrototype === "function"
            ? actionClassOrPrototype.prototype
            : (actionClassOrPrototype || {});
        // 対象のメソッド一覧を取得
        const methodNames = new Set();
        let current = proto;
        while (current && current !== Object.prototype) {
            for (const name of Object.getOwnPropertyNames(current)) {
                if (name !== "constructor" && !name.startsWith("_") && typeof current[name] === "function") {
                    methodNames.add(name);
                }
            }
            current = Object.getPrototypeOf(current);
        }
        for (const methodName of methodNames) {
            const lowerMethod = methodName.toLowerCase();
            let httpMethod = "ALL";
            if (/^(?:submit|insert|update|delete|save|post)/.test(lowerMethod)) {
                httpMethod = "POST";
            }
            if (methodName === "index") {
                this.registerRoute({
                    httpMethod,
                    path: `${basePath}`,
                    actionToken,
                    methodName
                });
                this.registerRoute({
                    httpMethod,
                    path: `${basePath}/`,
                    actionToken,
                    methodName
                });
                this.registerRoute({
                    httpMethod,
                    path: `${basePath}/index`,
                    actionToken,
                    methodName
                });
            }
            else {
                this.registerRoute({
                    httpMethod,
                    path: `${basePath}/${methodName}`,
                    actionToken,
                    methodName
                });
            }
        }
        return this;
    }
    /**
     * 登録済みルート一覧を取得
     */
    getRoutes() {
        return [...this.routes];
    }
    /**
     * HTTP リクエストコンテキストをディスパッチして Action メソッドを実行し、レスポンスを生成する
     */
    async handleRequest(ctx) {
        const method = (ctx.method || "GET").toUpperCase();
        const rawPath = (ctx.path || "/").split("?")[0];
        const normalizedPath = rawPath.length > 1 && rawPath.endsWith("/")
            ? rawPath.slice(0, -1)
            : rawPath;
        // ルートのマッチング (完全一致または末尾スラッシュ対応)
        const matchedRoute = this.routes.find(r => {
            const isMethodMatch = r.httpMethod === "ALL" || r.httpMethod === method;
            if (!isMethodMatch)
                return false;
            const rPathNorm = r.path.length > 1 && r.path.endsWith("/") ? r.path.slice(0, -1) : r.path;
            return rPathNorm === normalizedPath || r.path === rawPath;
        });
        if (!matchedRoute) {
            return {
                status: 404,
                headers: { "content-type": "application/json; charset=utf-8" },
                body: { error: "Not Found", path: ctx.path, method: ctx.method }
            };
        }
        // DI コンテナから Action インスタンスを取得
        let actionInstance;
        try {
            actionInstance = this.container.get(matchedRoute.actionToken);
        }
        catch (err) {
            return {
                status: 500,
                headers: { "content-type": "application/json; charset=utf-8" },
                body: { error: `Failed to resolve action component "${matchedRoute.actionToken}": ${err.message}` }
            };
        }
        if (typeof actionInstance[matchedRoute.methodName] !== "function") {
            return {
                status: 500,
                headers: { "content-type": "application/json; charset=utf-8" },
                body: { error: `Action method "${matchedRoute.methodName}" not found on component "${matchedRoute.actionToken}"` }
            };
        }
        // パラメータバインディング (Query + Body)
        const combinedParams = {
            ...(ctx.query || {}),
            ...(typeof ctx.body === "object" && ctx.body !== null ? ctx.body : {})
        };
        // ActionForm プロパティへのバインディング（存在する場合）
        let boundForm = undefined;
        for (const key of Object.keys(actionInstance)) {
            if (key.toLowerCase().endsWith("form") && typeof actionInstance[key] === "object" && actionInstance[key] !== null) {
                Object.assign(actionInstance[key], combinedParams);
                boundForm = actionInstance[key];
                break;
            }
        }
        // Action のパブリックフィールドへの直接バインディング
        for (const [k, v] of Object.entries(combinedParams)) {
            if (k in actionInstance && typeof actionInstance[k] !== "function") {
                actionInstance[k] = v;
            }
        }
        // メソッド実行
        const targetMethod = actionInstance[matchedRoute.methodName];
        let rawResult;
        try {
            if (targetMethod.length > 0) {
                // 引数を期待する場合は boundForm または combinedParams を渡す
                rawResult = await targetMethod.call(actionInstance, boundForm || combinedParams);
            }
            else {
                rawResult = await targetMethod.call(actionInstance);
            }
        }
        catch (execErr) {
            return {
                status: 500,
                headers: { "content-type": "application/json; charset=utf-8" },
                body: { error: execErr.message || "Internal Server Error" }
            };
        }
        // 戻り値の正規化 (ActionResult 化)
        let actionRes;
        if (rawResult && typeof rawResult === "object" && "type" in rawResult) {
            actionRes = rawResult;
        }
        else if (typeof rawResult === "string") {
            // SA-Struts の遷移文字列対応: "userList.jsp" または "show?redirect=true"
            if (rawResult.includes("redirect=true")) {
                const dest = rawResult.replace(/[?&]redirect=true/, "");
                actionRes = (0, actionResult_1.redirect)(dest.startsWith("/") ? dest : `/${dest}`);
            }
            else {
                actionRes = (0, actionResult_1.view)(rawResult);
            }
        }
        else if (rawResult !== undefined && rawResult !== null) {
            actionRes = (0, actionResult_1.json)(rawResult);
        }
        else {
            actionRes = { type: "json", data: { success: true }, status: 200 };
        }
        // HttpResponseData へ変換
        const defaultHeaders = {
            ...(actionRes.headers || {})
        };
        let responseBody = actionRes.data;
        if (actionRes.type === "view") {
            if (!defaultHeaders["content-type"]) {
                defaultHeaders["content-type"] = "text/html; charset=utf-8";
            }
            responseBody = actionRes.data !== undefined ? actionRes.data : `<!-- View: ${actionRes.path} -->`;
        }
        else if (actionRes.type === "redirect") {
            defaultHeaders["location"] = actionRes.path || "/";
            responseBody = `Redirecting to ${actionRes.path}`;
        }
        return {
            status: actionRes.status || 200,
            headers: defaultHeaders,
            body: responseBody,
            actionResult: actionRes
        };
    }
}
exports.S2HttpRouter = S2HttpRouter;
/**
 * Node.js 標準 http.Server, Express, Connect 等でそのまま使えるリクエストハンドラ関数を生成する
 */
function createHttpHandler(router) {
    return async (req, res) => {
        // URL と クエリパラメータの解析
        const [rawPath, rawQuery] = (req.url || "/").split("?");
        const query = {};
        if (rawQuery) {
            const searchParams = new URLSearchParams(rawQuery);
            searchParams.forEach((val, key) => {
                query[key] = val;
            });
        }
        // リクエストボディの読み込み（既に body-parser 等で parse されていなければ読み込み）
        let body = req.body;
        if (body === undefined && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
            body = await new Promise((resolve) => {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                    const raw = Buffer.concat(chunks).toString("utf-8");
                    const contentType = req.headers["content-type"] || "";
                    if (contentType.includes("application/json")) {
                        try {
                            resolve(JSON.parse(raw));
                        }
                        catch {
                            resolve(raw);
                        }
                    }
                    else if (contentType.includes("application/x-www-form-urlencoded")) {
                        const parsedForm = {};
                        new URLSearchParams(raw).forEach((val, key) => {
                            parsedForm[key] = val;
                        });
                        resolve(parsedForm);
                    }
                    else {
                        resolve(raw);
                    }
                });
                req.on("error", () => resolve(undefined));
            });
        }
        const ctx = {
            method: req.method || "GET",
            path: rawPath,
            query,
            body,
            headers: req.headers,
            session: req.session
        };
        const responseData = await router.handleRequest(ctx);
        res.statusCode = responseData.status;
        for (const [k, v] of Object.entries(responseData.headers)) {
            res.setHeader(k, v);
        }
        if (responseData.body !== undefined && responseData.body !== null) {
            if (typeof responseData.body === "string" || Buffer.isBuffer(responseData.body)) {
                res.end(responseData.body);
            }
            else {
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify(responseData.body));
            }
        }
        else {
            res.end();
        }
    };
}
//# sourceMappingURL=router.js.map