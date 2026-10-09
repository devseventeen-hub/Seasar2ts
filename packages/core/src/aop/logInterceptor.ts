import { Interceptor, MethodInvocation } from "./interceptor";

export interface LogInterceptorOptions {
  logger?: (msg: string) => void;
}

/**
 * メソッド呼び出しの引数、戻り値、所要時間を記録する Interceptor
 */
export class LogInterceptor implements Interceptor {
  private log: (msg: string) => void;

  constructor(options?: LogInterceptorOptions) {
    this.log = options?.logger || ((msg: string) => console.log(`[LogInterceptor] ${msg}`));
  }

  async invoke(invocation: MethodInvocation): Promise<any> {
    const methodName = String(invocation.method);
    const targetName = invocation.target?.constructor?.name || "Target";
    const startTime = Date.now();

    this.log(`BEGIN ${targetName}#${methodName} with args: ${JSON.stringify(invocation.args)}`);
    try {
      const result = await invocation.proceed();
      const elapsed = Date.now() - startTime;
      this.log(`END ${targetName}#${methodName} (${elapsed}ms) result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.log(`ERROR ${targetName}#${methodName} (${elapsed}ms) threw: ${error}`);
      throw error;
    }
  }
}
