import * as fs from "fs";
import * as path from "path";
import { interfaces } from "inversify";
import { S2HierarchicalContainer } from "../container/hierarchicalContainer";
import {
  parseDiconContent,
  parseDiconFile,
  DiconDefinition,
  DiconComponentDefinition,
  DiconArg,
  DiconProperty
} from "./diconParser";
import { applyPointcutAdvisors, PointcutAdvisor } from "../aop/pointcut";
import { Interceptor } from "../aop/interceptor";

/**
 * ランタイム時に XML (.dicon) から直接 S2HierarchicalContainer を動的に構築するローダー
 */
export class DiconLoader {
  private classRegistry: Map<string, any> = new Map();

  constructor(private rootContainer: S2HierarchicalContainer = new S2HierarchicalContainer("root")) {}

  /**
   * クラスコンストラクタを登録する
   */
  registerClass(name: string, ctor: any): this {
    this.classRegistry.set(name, ctor);
    const simple = name.split(".").pop();
    if (simple && simple !== name) {
      this.classRegistry.set(simple, ctor);
    }
    return this;
  }

  /**
   * 複数のクラスコンストラクタを一括登録する
   */
  registerClasses(classes: Record<string, any>): this {
    for (const [name, ctor] of Object.entries(classes)) {
      this.registerClass(name, ctor);
    }
    return this;
  }

  /**
   * ルートコンテナを取得する
   */
  getContainer(): S2HierarchicalContainer {
    return this.rootContainer;
  }

  /**
   * .dicon ファイルからコンテナツリーを構築する
   */
  load(diconPath: string): S2HierarchicalContainer {
    const fullPath = path.resolve(diconPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`dicon file not found: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    return this.loadContent(content, path.dirname(fullPath), path.basename(fullPath));
  }

  /**
   * XML 文字列から動的にコンテナを構築する
   */
  loadContent(xmlContent: string, baseDir?: string, filePath: string = "inline.dicon"): S2HierarchicalContainer {
    const dicon = parseDiconContent(xmlContent, filePath);
    this.configureContainer(this.rootContainer, dicon, baseDir);
    return this.rootContainer;
  }

  private configureContainer(container: S2HierarchicalContainer, dicon: DiconDefinition, baseDir?: string): void {
    // 1. Includes
    for (const inc of dicon.includes) {
      const includePath = baseDir ? path.resolve(baseDir, inc.path) : inc.path;
      if (fs.existsSync(includePath)) {
        const incContent = fs.readFileSync(includePath, "utf-8");
        const incDicon = parseDiconContent(incContent, includePath);
        this.configureContainer(container, incDicon, path.dirname(includePath));
      }
    }

    // 2. Components
    for (const comp of dicon.components) {
      this.bindComponent(container, comp);
    }
  }

  private bindComponent(container: S2HierarchicalContainer, comp: DiconComponentDefinition): void {
    const primaryKey = comp.name || (comp.className ? comp.className.split(".").pop()! : "anonymous");
    const simpleClassName = comp.className ? comp.className.split(".").pop()! : undefined;
    const Ctor = comp.className ? this.resolveClass(comp.className) : undefined;

    const binding = container.bind(primaryKey).toDynamicValue((context) => {
      // 1. Instantiate
      let instance: any;
      const ctorArgs = (comp.args || []).map(arg => this.resolveArg(arg, context.container));
      if (Ctor) {
        instance = new Ctor(...ctorArgs);
      } else {
        instance = {};
      }

      // 2. Inject Properties
      for (const prop of comp.properties || []) {
        instance[prop.name] = this.resolveProp(prop, context.container);
      }

      // 3. Invoke initMethods
      for (const init of comp.initMethods || []) {
        const initArgs = (init.args || []).map(arg => this.resolveArg(arg, context.container));
        if (typeof instance[init.methodName] === "function") {
          instance[init.methodName](...initArgs);
        }
      }

      return instance;
    });

    // Scopes
    if (comp.instanceScope === "prototype") {
      binding.inTransientScope();
    } else if (comp.instanceScope === "request") {
      binding.inRequestScope();
    } else {
      binding.inSingletonScope();
    }

    // Aspects (via onActivation)
    if (comp.aspectDefs && comp.aspectDefs.length > 0) {
      binding.onActivation((context, instance: any) => {
        const advisors: PointcutAdvisor[] = comp.aspectDefs.map(asp => ({
          pointcut: {
            methodPattern: asp.pointcut
              ? (asp.pointcut.startsWith("/") ? new RegExp(asp.pointcut.slice(1, -1)) : asp.pointcut)
              : ".*"
          },
          interceptor: context.container.get<Interceptor>(asp.interceptorName)
        }));
        return applyPointcutAdvisors(instance, simpleClassName || primaryKey, advisors);
      });
    }

    // DestroyMethods (via onDeactivation)
    if (comp.destroyMethods && comp.destroyMethods.length > 0) {
      for (const dm of comp.destroyMethods) {
        binding.onDeactivation((instance: any) => {
          if (typeof instance[dm.methodName] === "function") {
            instance[dm.methodName]();
          }
        });
      }
    }

    // If both name and className are present, allow lookup by simple class name
    if (comp.name && simpleClassName && simpleClassName !== comp.name && !container.isBound(simpleClassName)) {
      container.bind(simpleClassName).toDynamicValue((context) => context.container.get(primaryKey));
    }
  }

  private resolveClass(className: string): any {
    if (this.classRegistry.has(className)) {
      return this.classRegistry.get(className);
    }
    const simple = className.split(".").pop();
    if (simple && this.classRegistry.has(simple)) {
      return this.classRegistry.get(simple);
    }
    return undefined;
  }

  private resolveArg(arg: DiconArg, container: interfaces.Container): any {
    if (arg.componentName) {
      return container.get(arg.componentName);
    }
    if (arg.value !== undefined) {
      return this.parseValue(arg.value);
    }
    return undefined;
  }

  private resolveProp(prop: DiconProperty, container: interfaces.Container): any {
    if (prop.componentName) {
      return container.get(prop.componentName);
    }
    if (prop.value !== undefined) {
      return this.parseValue(prop.value);
    }
    return undefined;
  }

  private parseValue(val: string): any {
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return Number(val);
    }
    if (val === "true") return true;
    if (val === "false") return false;
    return val;
  }
}
