"use strict";
/**
 * Action の戻り値（画面遷移、リダイレクト、JSON レスポンス）を抽象化する型およびヘルパー関数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.view = view;
exports.redirect = redirect;
exports.json = json;
/**
 * 画面（View）遷移を表現する ActionResult を生成
 * @param path 遷移先 View パス（例: "userList.jsp" または "/views/userList"）
 * @param data View に渡すモデルデータ
 */
function view(path, data) {
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
function redirect(url, status = 302) {
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
function json(data, status = 200) {
    return {
        type: "json",
        data,
        status,
        headers: { "content-type": "application/json; charset=utf-8" }
    };
}
//# sourceMappingURL=actionResult.js.map