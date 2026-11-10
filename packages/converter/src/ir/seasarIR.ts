/**
 * Seasar2 中間表現 (Intermediate Representation - IR)
 * Java ソースコードから抽出された Seasar2 の構造モデル
 */

export type ComponentLayer = "action" | "logic" | "dao" | "entity" | "form" | "dto" | "other";

export interface SeasarFieldIR {
  name: string;
  type: string;
  isBinding: boolean; // @Binding アノテーションの有無
  visibility: "public" | "protected" | "private";
  docComment?: string; // /** ... */ JavaDoc コメント
}

export interface SeasarMethodIR {
  name: string;
  returnType: string;
  parameters: { name: string; type: string; docComment?: string }[];
  sqlFile?: string; // @Sql("xxx.sql") の指定値
  isTransactional?: boolean; // @Transactional 等の有無
  annotations: string[];
  docComment?: string; // /** ... */ JavaDoc コメント
  httpMethod?: "GET" | "POST" | "ALL";
  routePath?: string; // 例: /user/submit
}

export interface SeasarClassIR {
  packageName: string;
  className: string;
  isInterface: boolean;
  layer: ComponentLayer;
  annotations: string[];
  fields: SeasarFieldIR[];
  methods: SeasarMethodIR[];
  docComment?: string; // クラスレベル JavaDoc
  sourceFilePath?: string;
}

export interface SeasarProjectIR {
  classes: SeasarClassIR[];
  diconFiles: string[];
  sqlFiles: string[];
}
