import { S2HierarchicalContainer } from "../container/hierarchicalContainer";
import { ActionResult } from "./actionResult";
export interface HttpRequestContext {
    method: string;
    path: string;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string | string[] | undefined>;
    session?: Record<string, any>;
}
export interface HttpResponseData {
    status: number;
    headers: Record<string, string>;
    body: any;
    actionResult?: ActionResult;
}
export interface RouteDefinition {
    httpMethod: "GET" | "POST" | "ALL";
    path: string;
    actionToken: string;
    methodName: string;
}
/**
 * キャメルケース・パス名を正規化する (UserAction -> /user, ItemCategoryAction -> /itemCategory)
 */
export declare function inferActionBasePath(actionNameOrClass: string): string;
/**
 * Seasar2 命名規約に基づく Web ルーターおよび汎用 HTTP ディスパッチャ
 */
export declare class S2HttpRouter {
    private container;
    private routes;
    constructor(container: S2HierarchicalContainer);
    /**
     * 明示的にルーティング定義を追加する
     */
    registerRoute(route: RouteDefinition): this;
    /**
     * Action クラスまたはインスタンスから命名規約に基づいてルーティングを自動登録する
     * 例: UserAction -> /user (index -> GET/POST /user/, submit -> POST /user/submit)
     */
    registerAction(actionToken: string, actionClassOrPrototype?: any, customBasePath?: string): this;
    /**
     * 登録済みルート一覧を取得
     */
    getRoutes(): RouteDefinition[];
    /**
     * HTTP リクエストコンテキストをディスパッチして Action メソッドを実行し、レスポンスを生成する
     */
    handleRequest(ctx: HttpRequestContext): Promise<HttpResponseData>;
}
/**
 * Node.js 標準 http.Server, Express, Connect 等でそのまま使えるリクエストハンドラ関数を生成する
 */
export declare function createHttpHandler(router: S2HttpRouter): (req: any, res: any) => Promise<void>;
//# sourceMappingURL=router.d.ts.map