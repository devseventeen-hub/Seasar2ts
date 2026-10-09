import { Interceptor, MethodInvocation } from "./interceptor";
import { Database } from "../dao/database";

/**
 * トランザクション境界を制御する Interceptor (Seasar2 の tx:requiredTx 等に相当)
 */
export class TxInterceptor implements Interceptor {
  constructor(private db: Database) {}

  async invoke(invocation: MethodInvocation): Promise<any> {
    await this.db.beginTransaction();
    try {
      const result = await invocation.proceed();
      await this.db.commit();
      return result;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }
}
