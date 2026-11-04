import { Interceptor, MethodInvocation } from "./interceptor";
import { Database } from "../dao/database";
import { DbConnectionPool, PooledConnection } from "../dao/pool";
/**
 * 現在アクティブなトランザクション接続を取得する
 */
export declare function getCurrentTxConnection(): (Database | PooledConnection) | undefined;
/**
 * トランザクション対応の Database プロキシを生成する
 * トランザクション実行中はリースされた接続へ、それ以外は元 db へ自動ルーティング
 */
export declare function createTransactionalDatabase(db: Database): Database;
/**
 * トランザクション境界を制御する Interceptor (Seasar2 の tx:requiredTx 等に相当)
 * 接続プール (DbConnectionPool) との統合により、トランザクション開始時に接続を1つリースし、
 * コミット/ロールバック完了時に確実に返却（リーク完全防止）
 */
export declare class TxInterceptor implements Interceptor {
    private db;
    constructor(db: Database | DbConnectionPool);
    invoke(invocation: MethodInvocation): Promise<any>;
}
//# sourceMappingURL=txInterceptor.d.ts.map