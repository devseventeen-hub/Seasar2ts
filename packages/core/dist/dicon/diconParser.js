"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDiconFile = parseDiconFile;
exports.parseDiconContent = parseDiconContent;
const fast_xml_parser_1 = require("fast-xml-parser");
const fs = __importStar(require("fs"));
/**
 * Seasar2 の .dicon (XML) ファイルをパースして構造化データを抽出する
 */
function parseDiconFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`dicon file not found: ${filePath}`);
    }
    const xmlContent = fs.readFileSync(filePath, "utf-8");
    return parseDiconContent(xmlContent, filePath);
}
/**
 * dicon XML 文字列をパースする
 */
function parseDiconContent(xmlContent, filePath = "inline.dicon") {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        allowBooleanAttributes: true
    });
    const parsed = parser.parse(xmlContent);
    const componentsNode = parsed.components || {};
    const includes = [];
    const components = [];
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
            const aspects = [];
            const properties = [];
            // <aspect>
            if (comp.aspect) {
                const rawAspects = Array.isArray(comp.aspect) ? comp.aspect : [comp.aspect];
                for (const asp of rawAspects) {
                    const aspName = typeof asp === "string" ? asp.trim() : (asp["#text"] || asp["@_pointcut"] || "");
                    if (aspName)
                        aspects.push(aspName);
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
//# sourceMappingURL=diconParser.js.map