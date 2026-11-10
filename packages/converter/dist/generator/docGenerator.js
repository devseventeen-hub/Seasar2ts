"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocGenerator = void 0;
const tsGenerator_1 = require("./tsGenerator");
/**
 * Seasar2 の Java 資産から型安全な API カタログ（Markdown）および OpenAPI/JSON スキーマを生成するジェネレータ
 */
class DocGenerator {
    /**
     * 人間および AI 向け API & Type カタログ (Markdown) を出力する
     */
    generateApiCatalogMarkdown(classes, options = {}) {
        const title = options.title || "Application API & Type Catalog";
        const version = options.version || "1.0.0";
        const lines = [];
        lines.push(`# ${title}`);
        lines.push(``);
        lines.push(`> Version: ${version}  `);
        lines.push(`> Generated automatically by **Seasar2ts Converter**.  `);
        lines.push(`> This specification serves as the authoritative backend contract for frontend integration and AI-assisted UI regeneration.`);
        lines.push(``);
        const actionClasses = classes.filter(c => c.layer === "action");
        const modelClasses = classes.filter(c => c.layer === "form" || c.layer === "dto" || c.layer === "entity");
        // 1. Action Endpoints Summary
        lines.push(`## 1. Action Endpoints Summary`);
        lines.push(``);
        lines.push(`| HTTP Method | Route Path | Action Class | Action Method | Description |`);
        lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
        for (const action of actionClasses) {
            for (const method of action.methods) {
                const httpMethod = `\`${method.httpMethod || "ALL"}\``;
                const route = `\`${method.routePath || "/"}\``;
                const desc = (method.docComment || "-").replace(/\n/g, " ");
                lines.push(`| ${httpMethod} | ${route} | \`${action.className}\` | \`${method.name}\` | ${desc} |`);
            }
        }
        lines.push(``);
        // 2. Action Details
        lines.push(`## 2. Action Details`);
        lines.push(``);
        for (const action of actionClasses) {
            lines.push(`### \`${action.className}\``);
            if (action.packageName) {
                lines.push(`- **Package**: \`${action.packageName}\``);
            }
            if (action.docComment) {
                lines.push(`- **Description**: ${action.docComment}`);
            }
            // 依存サービス一覧
            const dependencies = action.fields.filter(f => f.isBinding || f.type.endsWith("Service") || f.type.endsWith("Logic") || f.type.endsWith("Dao"));
            if (dependencies.length > 0) {
                const depNames = dependencies.map(d => `\`${d.type}\``).join(", ");
                lines.push(`- **Dependencies**: ${depNames}`);
            }
            lines.push(``);
            for (const method of action.methods) {
                const httpMethod = method.httpMethod || "ALL";
                const route = method.routePath || "/";
                lines.push(`#### \`${httpMethod} ${route}\``);
                lines.push(``);
                lines.push(`- **Action Method**: \`${action.className}#${method.name}\``);
                if (method.docComment) {
                    lines.push(`- **Summary**: ${method.docComment}`);
                }
                lines.push(`- **Return Type**: \`Promise<ActionResult>\``);
                if (method.parameters.length > 0) {
                    lines.push(`- **Parameters**:`);
                    for (const param of method.parameters) {
                        const tsType = (0, tsGenerator_1.mapJavaTypeToTs)(param.type);
                        const pDesc = param.docComment ? ` - ${param.docComment}` : "";
                        lines.push(`  - \`${param.name}\`: \`${tsType}\`${pDesc}`);
                    }
                }
                else {
                    lines.push(`- **Parameters**: (None)`);
                }
                lines.push(``);
            }
        }
        // 3. Data Models & Forms
        if (modelClasses.length > 0) {
            lines.push(`## 3. Data Models & Forms`);
            lines.push(``);
            for (const model of modelClasses) {
                const layerBadge = model.layer.toUpperCase();
                lines.push(`### \`${model.className}\` (${layerBadge})`);
                if (model.docComment) {
                    lines.push(`> ${model.docComment}`);
                    lines.push(``);
                }
                if (model.fields.length > 0) {
                    lines.push(`| Field Name | TypeScript Type | Description |`);
                    lines.push(`| :--- | :--- | :--- |`);
                    for (const field of model.fields) {
                        const tsType = (0, tsGenerator_1.mapJavaTypeToTs)(field.type);
                        const fDesc = (field.docComment || "-").replace(/\n/g, " ");
                        lines.push(`| \`${field.name}\` | \`${tsType}\` | ${fDesc} |`);
                    }
                    lines.push(``);
                }
                else {
                    lines.push(`*(No fields defined)*`);
                    lines.push(``);
                }
            }
        }
        return lines.join("\n");
    }
    /**
     * OpenAPI 3.0 / JSON Schema 互換の構造化メタデータを生成する
     */
    generateApiSpecJson(classes, options = {}) {
        const title = options.title || "Application API Specification";
        const version = options.version || "1.0.0";
        const actionClasses = classes.filter(c => c.layer === "action");
        const modelClasses = classes.filter(c => c.layer === "form" || c.layer === "dto" || c.layer === "entity");
        const paths = {};
        for (const action of actionClasses) {
            for (const method of action.methods) {
                const routePath = method.routePath || `/${action.className.toLowerCase()}/${method.name}`;
                const httpMethodLower = (method.httpMethod || "get").toLowerCase();
                const effectiveMethod = httpMethodLower === "all" ? "post" : httpMethodLower;
                if (!paths[routePath]) {
                    paths[routePath] = {};
                }
                const operation = {
                    summary: method.docComment || `${action.className}#${method.name}`,
                    operationId: `${action.className}_${method.name}`,
                    tags: [action.className],
                    responses: {
                        "200": {
                            description: "Successful response (ActionResult)"
                        }
                    }
                };
                if (method.parameters.length > 0) {
                    if (effectiveMethod === "get") {
                        operation.parameters = method.parameters.map(p => ({
                            name: p.name,
                            in: "query",
                            required: false,
                            description: p.docComment || "",
                            schema: { type: this.mapTsTypeToJsonSchemaType((0, tsGenerator_1.mapJavaTypeToTs)(p.type)) }
                        }));
                    }
                    else {
                        const properties = {};
                        for (const p of method.parameters) {
                            properties[p.name] = {
                                type: this.mapTsTypeToJsonSchemaType((0, tsGenerator_1.mapJavaTypeToTs)(p.type)),
                                description: p.docComment || ""
                            };
                        }
                        operation.requestBody = {
                            required: true,
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties
                                    }
                                }
                            }
                        };
                    }
                }
                paths[routePath][effectiveMethod] = operation;
            }
        }
        const schemas = {};
        for (const model of modelClasses) {
            const properties = {};
            for (const field of model.fields) {
                properties[field.name] = {
                    type: this.mapTsTypeToJsonSchemaType((0, tsGenerator_1.mapJavaTypeToTs)(field.type)),
                    description: field.docComment || ""
                };
            }
            schemas[model.className] = {
                type: "object",
                description: model.docComment || "",
                properties
            };
        }
        const spec = {
            openapi: "3.0.3",
            info: {
                title,
                version,
                description: options.description || "Generated automatically by Seasar2ts Converter"
            },
            paths,
            components: {
                schemas
            }
        };
        return JSON.stringify(spec, null, 2);
    }
    mapTsTypeToJsonSchemaType(tsType) {
        switch (tsType) {
            case "number":
                return "number";
            case "boolean":
                return "boolean";
            case "string":
            case "Date":
                return "string";
            default:
                return "object";
        }
    }
}
exports.DocGenerator = DocGenerator;
//# sourceMappingURL=docGenerator.js.map