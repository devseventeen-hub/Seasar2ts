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
