import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";

export interface DiconComponent {
  name?: string;
  className?: string;
  aspects: string[];
  properties: { name: string; value?: string; componentName?: string }[];
}

export interface DiconInclude {
  path: string;
}

export interface DiconDefinition {
  filePath: string;
  includes: DiconInclude[];
  components: DiconComponent[];
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

  const includes: DiconInclude[] = [];
  const components: DiconComponent[] = [];

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
      const aspects: string[] = [];
      const properties: { name: string; value?: string; componentName?: string }[] = [];

      // <aspect>
      if (comp.aspect) {
        const rawAspects = Array.isArray(comp.aspect) ? comp.aspect : [comp.aspect];
        for (const asp of rawAspects) {
          const aspName = typeof asp === "string" ? asp.trim() : (asp["#text"] || asp["@_pointcut"] || "");
          if (aspName) aspects.push(aspName);
        }
      }

      // <property>
      if (comp.property) {
        const rawProps = Array.isArray(comp.property) ? comp.property : [comp.property];
        for (const pr of rawProps) {
          properties.push({
            name: pr["@_name"] || "",
            value: pr["#text"],
            componentName: pr["@_component"]
          });
        }
      }

      components.push({
        name,
        className,
        aspects,
        properties
      });
    }
  }

  return {
    filePath,
    includes,
    components
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
}

/**
 * 文字列の前後の引用符を剥がす
 */
function unquote(str?: string): string | undefined {
  if (!str) return undefined;
  const trimmed = str.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * JDBC URL から接続情報をパースする
 */
export function parseJdbcUrl(url: string): Partial<DiconDataSourceConfig> {
  const result: Partial<DiconDataSourceConfig> = { url };

  if (url.startsWith("jdbc:postgresql://")) {
    result.dbType = "postgresql";
    // jdbc:postgresql://host:port/database
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
 * DiconDefinition から dataSource コンポーネントの設定を抽出する
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

  return {
    dbType,
    driverClassName,
    url: rawUrl,
    user,
    password,
    host: parsedUrl.host,
    port: parsedUrl.port,
    database: parsedUrl.database
  };
}
