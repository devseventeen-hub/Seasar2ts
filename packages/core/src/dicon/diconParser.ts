import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";
import { PoolConfig } from "../dao/pool";
export type { PoolConfig };

export interface DiconArg {
  index?: number;
  value?: string;
  componentName?: string;
  expression?: string;
}

export interface DiconProperty {
  name: string;
  value?: string;
  componentName?: string;
  expression?: string;
}

export interface DiconAspect {
  interceptorName: string;
  pointcut?: string;
}

export interface DiconMethodInvocation {
  methodName: string;
  args: DiconArg[];
}

export interface DiconMeta {
  name: string;
  value?: string;
}

export interface DiconComponentDefinition {
  name?: string;
  className?: string;
  instanceScope?: "singleton" | "prototype" | "request" | "session";
  autoBinding?: "auto" | "constructor" | "property" | "none";
  args: DiconArg[];
  properties: DiconProperty[];
  aspects: (DiconAspect | string)[];
  aspectDefs: DiconAspect[];
  initMethods: DiconMethodInvocation[];
  destroyMethods: DiconMethodInvocation[];
  metas: DiconMeta[];
}

export type DiconComponent = DiconComponentDefinition;

export interface DiconInclude {
  path: string;
}

export interface DiconDefinition {
  filePath: string;
  namespace?: string;
  includes: DiconInclude[];
  components: DiconComponentDefinition[];
  metas: DiconMeta[];
}

/**
 * 文字列の前後の引用符を剥がす
 */
export function unquote(str?: string): string | undefined {
  if (!str) return undefined;
  const trimmed = str.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * <arg> 要素のパース補助
 */
function parseArgNode(rawArg: any): DiconArg {
  let index: number | undefined;
  let componentName: string | undefined;
  let value: string | undefined;
  let expression: string | undefined;

  if (typeof rawArg === "object" && rawArg !== null) {
    if (rawArg["@_index"] !== undefined) {
      index = parseInt(rawArg["@_index"], 10);
    }
    if (rawArg["@_component"]) {
      componentName = rawArg["@_component"];
    }

    const textContent = rawArg["#text"] !== undefined ? String(rawArg["#text"]).trim() : undefined;
    if (textContent) {
      if (textContent.startsWith("#")) {
        componentName = textContent.slice(1);
      } else {
        value = unquote(textContent);
      }
    }
    if (rawArg["@_expression"]) {
      expression = rawArg["@_expression"];
    }
  } else if (rawArg !== undefined && rawArg !== null) {
    const text = String(rawArg).trim();
    if (text.startsWith("#")) {
      componentName = text.slice(1);
    } else {
      value = unquote(text);
    }
  }

  return { index, value, componentName, expression };
}

/**
 * <meta> 要素のパース補助
 */
function parseMetaNodes(metaNode: any): DiconMeta[] {
  if (!metaNode) return [];
  const rawMetas = Array.isArray(metaNode) ? metaNode : [metaNode];
  const metas: DiconMeta[] = [];

  for (const m of rawMetas) {
    if (typeof m === "object" && m !== null) {
      const name = m["@_name"] || "";
      const val = m["#text"] !== undefined ? unquote(String(m["#text"])) : unquote(m["@_value"]);
      metas.push({ name, value: val });
    } else if (m !== undefined) {
      metas.push({ name: String(m), value: undefined });
    }
  }

  return metas;
}

/**
 * Seasar2 の .dicon (XML) ファイルをパースして構造化データを抽出する
 */
export function parseDiconFile(filePath: string): DiconDefinition {
  if (!fs.existsSync(filePath)) {
    throw new Error(`dicon file not found: ${filePath}`);
  }

  const xmlContent = fs.readFileSync(filePath, "utf-8");
  return parseDiconContent(xmlContent, filePath);
}

/**
 * dicon XML 文字列をパースする
 */
export function parseDiconContent(xmlContent: string, filePath: string = "inline.dicon"): DiconDefinition {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true
  });

  const parsed = parser.parse(xmlContent);
  const componentsNode = parsed.components || {};

  const namespace = componentsNode["@_namespace"];
  const includes: DiconInclude[] = [];
  const components: DiconComponentDefinition[] = [];
  const metas: DiconMeta[] = parseMetaNodes(componentsNode.meta);

  // 1. <include> 要素の抽出
  if (componentsNode.include) {
    const rawIncludes = Array.isArray(componentsNode.include)
      ? componentsNode.include
      : [componentsNode.include];

    for (const inc of rawIncludes) {
      const incPath = inc["@_path"];
      if (incPath) {
        includes.push({ path: incPath });
      }
    }
  }

  // 2. <component> 要素の抽出
  if (componentsNode.component) {
    const rawComponents = Array.isArray(componentsNode.component)
      ? componentsNode.component
      : [componentsNode.component];

    for (const comp of rawComponents) {
      const name = comp["@_name"];
      const className = comp["@_class"];
      const instanceScope = comp["@_instance"] as any;
      const autoBinding = comp["@_autoBinding"] as any;

      const args: DiconArg[] = [];
      const properties: DiconProperty[] = [];
      const aspects: (DiconAspect | string)[] = [];
      const aspectDefs: DiconAspect[] = [];
      const initMethods: DiconMethodInvocation[] = [];
      const destroyMethods: DiconMethodInvocation[] = [];
      const compMetas: DiconMeta[] = parseMetaNodes(comp.meta);

      // <arg>
      if (comp.arg !== undefined) {
        const rawArgs = Array.isArray(comp.arg) ? comp.arg : [comp.arg];
        for (const a of rawArgs) {
          args.push(parseArgNode(a));
        }
      }

      // <property>
      if (comp.property) {
        const rawProps = Array.isArray(comp.property) ? comp.property : [comp.property];
        for (const pr of rawProps) {
          let propVal: string | undefined;
          let propComp: string | undefined = pr["@_component"];
          const propExpr: string | undefined = pr["@_expression"];

          const rawText = pr["#text"] !== undefined ? String(pr["#text"]).trim() : undefined;
          if (rawText) {
            if (rawText.startsWith("#")) {
              propComp = rawText.slice(1);
            } else {
              propVal = unquote(rawText);
            }
          }

          properties.push({
            name: pr["@_name"] || "",
            value: propVal,
            componentName: propComp,
            expression: propExpr
          });
        }
      }

      // <aspect>
      if (comp.aspect) {
        const rawAspects = Array.isArray(comp.aspect) ? comp.aspect : [comp.aspect];
        for (const asp of rawAspects) {
          let interceptorName = "";
          let pointcut: string | undefined;

          if (typeof asp === "object" && asp !== null) {
            pointcut = asp["@_pointcut"];
            interceptorName = asp["#text"] !== undefined ? String(asp["#text"]).trim() : (asp["@_pointcut"] || "");
          } else if (typeof asp === "string") {
            interceptorName = asp.trim();
          }

          if (interceptorName) {
            const aspectDef: DiconAspect = { interceptorName, pointcut };
            aspectDefs.push(aspectDef);
            aspects.push(pointcut ? aspectDef : interceptorName);
          }
        }
      }

      // <initMethod>
      if (comp.initMethod) {
        const rawInits = Array.isArray(comp.initMethod) ? comp.initMethod : [comp.initMethod];
        for (const im of rawInits) {
          const methodName = im["@_name"] || "";
          const imArgs: DiconArg[] = [];
          if (im.arg !== undefined) {
            const rawArgs = Array.isArray(im.arg) ? im.arg : [im.arg];
            for (const a of rawArgs) {
              imArgs.push(parseArgNode(a));
            }
          }
          initMethods.push({ methodName, args: imArgs });
        }
      }

      // <destroyMethod>
      if (comp.destroyMethod) {
        const rawDestroys = Array.isArray(comp.destroyMethod) ? comp.destroyMethod : [comp.destroyMethod];
        for (const dm of rawDestroys) {
          const methodName = dm["@_name"] || "";
          const dmArgs: DiconArg[] = [];
          if (dm.arg !== undefined) {
            const rawArgs = Array.isArray(dm.arg) ? dm.arg : [dm.arg];
            for (const a of rawArgs) {
              dmArgs.push(parseArgNode(a));
            }
          }
          destroyMethods.push({ methodName, args: dmArgs });
        }
      }

      components.push({
        name,
        className,
        instanceScope,
        autoBinding,
        args,
        properties,
        aspects,
        aspectDefs,
        initMethods,
        destroyMethods,
        metas: compMetas
      });
    }
  }

  return {
    filePath,
    namespace,
    includes,
    components,
    metas
  };
}

export interface DiconDataSourceConfig {
  dbType: "postgresql" | "sqlite" | "mysql" | "unknown";
  driverClassName?: string;
  url?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  pool?: PoolConfig;
}

/**
 * JDBC URL から接続情報をパースする
 */
export function parseJdbcUrl(url: string): Partial<DiconDataSourceConfig> {
  const result: Partial<DiconDataSourceConfig> = { url };

  if (url.startsWith("jdbc:postgresql://")) {
    result.dbType = "postgresql";
    const match = url.match(/^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/(.+)$/);
    if (match) {
      result.host = match[1];
      result.port = match[2] ? parseInt(match[2], 10) : 5432;
      result.database = match[3];
    }
  } else if (url.startsWith("jdbc:sqlite:")) {
    result.dbType = "sqlite";
    result.database = url.replace(/^jdbc:sqlite:/, "");
  } else if (url.startsWith("jdbc:mysql://")) {
    result.dbType = "mysql";
    const match = url.match(/^jdbc:mysql:\/\/([^:/]+)(?::(\d+))?\/(.+)$/);
    if (match) {
      result.host = match[1];
      result.port = match[2] ? parseInt(match[2], 10) : 3306;
      result.database = match[3];
    }
  } else {
    result.dbType = "unknown";
  }

  return result;
}

/**
 * DiconDefinition から dataSource コンポーネントの設定を抽出する (接続プール設定対応)
 */
export function extractDataSourceConfig(dicon: DiconDefinition): DiconDataSourceConfig | undefined {
  const dsComp = dicon.components.find(
    c => c.name?.toLowerCase() === "datasource" || c.className?.includes("DataSource")
  );
  if (!dsComp) return undefined;

  let driverClassName: string | undefined;
  let rawUrl: string | undefined;
  let user: string | undefined;
  let password: string | undefined;

  // Pool settings
  let maxActive: number | undefined;
  let minIdle: number | undefined;
  let maxWait: number | undefined;
  let maxIdle: number | undefined;
  let idleTimeout: number | undefined;

  for (const prop of dsComp.properties) {
    const propName = prop.name.toLowerCase();
    const val = unquote(prop.value);
    if (propName === "driverclassname") {
      driverClassName = val;
    } else if (propName === "url") {
      rawUrl = val;
    } else if (propName === "user") {
      user = val;
    } else if (propName === "password") {
      password = val;
    } else if (propName === "maxactive" || propName === "maxpoolsize" || propName === "max") {
      maxActive = val ? parseInt(val, 10) : undefined;
    } else if (propName === "minidle" || propName === "minpoolsize" || propName === "min") {
      minIdle = val ? parseInt(val, 10) : undefined;
    } else if (propName === "maxwait" || propName === "acquiretimeoutmillis") {
      maxWait = val ? parseInt(val, 10) : undefined;
    } else if (propName === "maxidle") {
      maxIdle = val ? parseInt(val, 10) : undefined;
    } else if (propName === "idletimeout" || propName === "idletimeoutmillis") {
      idleTimeout = val ? parseInt(val, 10) : undefined;
    }
  }

  const parsedUrl = rawUrl ? parseJdbcUrl(rawUrl) : {};
  let dbType: "postgresql" | "sqlite" | "mysql" | "unknown" = parsedUrl.dbType || "unknown";

  if (dbType === "unknown" && driverClassName) {
    const lowerDriver = driverClassName.toLowerCase();
    if (lowerDriver.includes("postgres")) dbType = "postgresql";
    else if (lowerDriver.includes("sqlite")) dbType = "sqlite";
    else if (lowerDriver.includes("mysql")) dbType = "mysql";
  }

  const pool: PoolConfig = {
    max: maxActive ?? 10,
    min: minIdle ?? 1,
    acquireTimeoutMillis: maxWait ?? 10000,
    idleTimeoutMillis: idleTimeout ?? (maxIdle !== undefined ? maxIdle * 1000 : 30000)
  };

  return {
    dbType,
    driverClassName,
    url: rawUrl,
    user,
    password,
    host: parsedUrl.host,
    port: parsedUrl.port,
    database: parsedUrl.database,
    pool
  };
}
