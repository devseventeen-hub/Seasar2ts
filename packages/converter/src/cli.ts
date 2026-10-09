#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { SeasarJavaParser } from "./parser/javaParser";
import { SeasarTsGenerator } from "./generator/tsGenerator";
import { SeasarClassIR } from "./ir/seasarIR";

const program = new Command();

program
  .name("seasar2ts")
  .description("Convert Seasar2/S2Dao Java assets to TypeScript")
  .version("0.1.0")
  .requiredOption("-i, --input <dir>", "Input directory containing Java, dicon, and SQL files")
  .requiredOption("-o, --output <dir>", "Output directory for generated TypeScript code")
  .option("--jar <path>", "Path to JavaParser CLI jar")
  .action((options) => {
    runConversion(options.input, options.output, options.jar);
  });

export function runConversion(inputDir: string, outputDir: string, jarPath?: string): void {
  const resolvedInput = path.resolve(inputDir);
  const resolvedOutput = path.resolve(outputDir);

  console.log(`[Seasar2ts] Starting conversion...`);
  console.log(`  Input:  ${resolvedInput}`);
  console.log(`  Output: ${resolvedOutput}`);

  const parser = new SeasarJavaParser({ jarPath });
  const generator = new SeasarTsGenerator();

  // ディレクトリ再帰探索
  function findFiles(dir: string, ext: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findFiles(fullPath, ext));
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const javaFiles = findFiles(resolvedInput, ".java");
  const sqlFiles = findFiles(resolvedInput, ".sql");
  const diconFiles = findFiles(resolvedInput, ".dicon");

  console.log(`[Seasar2ts] Found ${javaFiles.length} Java files, ${sqlFiles.length} SQL files, ${diconFiles.length} dicon files.`);

  // 出力先ディレクトリの作成
  const srcDir = path.join(resolvedOutput, "src");
  const entityDir = path.join(srcDir, "entity");
  const daoDir = path.join(srcDir, "dao");
  const logicDir = path.join(srcDir, "logic");
  const actionDir = path.join(srcDir, "action");
  const sqlOutputDir = path.join(srcDir, "sql");

  for (const d of [entityDir, daoDir, logicDir, actionDir, sqlOutputDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // 1. Java ファイルの解析と TS 出力
  for (const jFile of javaFiles) {
    const ir: SeasarClassIR = parser.parseFile(jFile);
    const tsCode = generator.generateClassCode(ir);

    let targetDir = logicDir;
    if (ir.layer === "entity") targetDir = entityDir;
    else if (ir.layer === "dao") targetDir = daoDir;
    else if (ir.layer === "action") targetDir = actionDir;

    const outPath = path.join(targetDir, `${ir.className}.ts`);
    fs.writeFileSync(outPath, tsCode, "utf-8");
    console.log(`  ✔ Generated: ${path.relative(resolvedOutput, outPath)} (${ir.layer})`);
  }

  // 2. SQL ファイルのコピー
  for (const sFile of sqlFiles) {
    const relativeToInput = path.relative(resolvedInput, sFile);
    // sql/user/find.sql や user/find.sql 等のパス構造を保つ
    const destSql = path.join(sqlOutputDir, path.basename(path.dirname(sFile)), path.basename(sFile));
    fs.mkdirSync(path.dirname(destSql), { recursive: true });
    fs.copyFileSync(sFile, destSql);
    console.log(`  ✔ Copied SQL: ${path.relative(resolvedOutput, destSql)}`);
  }

  // 3. container.ts の生成
  const containerCode = generator.generateContainerBootstrap();
  fs.writeFileSync(path.join(srcDir, "container.ts"), containerCode, "utf-8");
  console.log(`  ✔ Generated: src/container.ts`);

  console.log(`[Seasar2ts] Conversion completed successfully! 🎉`);
}

if (require.main === module) {
  program.parse(process.argv);
}
