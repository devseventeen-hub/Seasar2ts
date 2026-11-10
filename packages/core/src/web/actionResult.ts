/**
 * Action の戻り値（画面遷移、リダイレクト、JSON レスポンス）を抽象化する型およびヘルパー関数
 */

export type ActionResultType = "view" | "redirect" | "json";

export interface ActionResult {
  type: ActionResultType;
  path?: string;
  data?: any;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * 画面（View）遷移を表現する ActionResult を生成
 * @param path 遷移先 View パス（例: "userList.jsp" または "/views/userList"）
 * @param data View に渡すモデルデータ
 */
export function view(path: string, data?: any): ActionResult {
  return {
    type: "view",
    path,
    data,
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  };
}

/**
 * HTTP リダイレクトを表現する ActionResult を生成
 * @param url リダイレクト先 URL またはパス
 * @param status HTTP ステータスコード (デフォルト: 302)
 */
export function redirect(url: string, status: number = 302): ActionResult {
  return {
    type: "redirect",
    path: url,
    status,
    headers: { location: url }
  };
}

/**
 * JSON API レスポンスを表現する ActionResult を生成
 * @param data レスポンスペイロード
 * @param status HTTP ステータスコード (デフォルト: 200)
 */
export function json(data: any, status: number = 200): ActionResult {
  return {
    type: "json",
    data,
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  };
}
