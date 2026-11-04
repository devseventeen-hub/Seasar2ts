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
exports.DiconLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const hierarchicalContainer_1 = require("../container/hierarchicalContainer");
const diconParser_1 = require("./diconParser");
const pointcut_1 = require("../aop/pointcut");
/**
 * ランタイム時に XML (.dicon) から直接 S2HierarchicalContainer を動的に構築するローダー
 */
class DiconLoader {
    rootContainer;
    classRegistry = new Map();
    constructor(rootContainer = new hierarchicalContainer_1.S2HierarchicalContainer("root")) {
        this.rootContainer = rootContainer;
    }
    /**
     * クラスコンストラクタを登録する
     */
    registerClass(name, ctor) {
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
    registerClasses(classes) {
        for (const [name, ctor] of Object.entries(classes)) {
            this.registerClass(name, ctor);
        }
        return this;
    }
    /**
     * ルートコンテナを取得する
     */
    getContainer() {
        return this.rootContainer;
    }
    /**
     * .dicon ファイルからコンテナツリーを構築する
     */
    load(diconPath) {
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
    loadContent(xmlContent, baseDir, filePath = "inline.dicon") {
        const dicon = (0, diconParser_1.parseDiconContent)(xmlContent, filePath);
        this.configureContainer(this.rootContainer, dicon, baseDir);
        return this.rootContainer;
    }
    configureContainer(container, dicon, baseDir) {
        // 1. Includes
        for (const inc of dicon.includes) {
            const includePath = baseDir ? path.resolve(baseDir, inc.path) : inc.path;
            if (fs.existsSync(includePath)) {
                const incContent = fs.readFileSync(includePath, "utf-8");
                const incDicon = (0, diconParser_1.parseDiconContent)(incContent, includePath);
                this.configureContainer(container, incDicon, path.dirname(includePath));
            }
        }
        // 2. Components
        for (const comp of dicon.components) {
            this.bindComponent(container, comp);
        }
    }
    bindComponent(container, comp) {
        const primaryKey = comp.name || (comp.className ? comp.className.split(".").pop() : "anonymous");
        const simpleClassName = comp.className ? comp.className.split(".").pop() : undefined;
        const Ctor = comp.className ? this.resolveClass(comp.className) : undefined;
        const binding = container.bind(primaryKey).toDynamicValue((context) => {
            // 1. Instantiate
            let instance;
            const ctorArgs = (comp.args || []).map(arg => this.resolveArg(arg, context.container));
            if (Ctor) {
                instance = new Ctor(...ctorArgs);
            }
            else {
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
        }
        else if (comp.instanceScope === "request") {
            binding.inRequestScope();
        }
        else {
            binding.inSingletonScope();
        }
        // Aspects (via onActivation)
        if (comp.aspectDefs && comp.aspectDefs.length > 0) {
            binding.onActivation((context, instance) => {
                const advisors = comp.aspectDefs.map(asp => ({
                    pointcut: {
                        methodPattern: asp.pointcut
                            ? (asp.pointcut.startsWith("/") ? new RegExp(asp.pointcut.slice(1, -1)) : asp.pointcut)
                            : ".*"
                    },
                    interceptor: context.container.get(asp.interceptorName)
                }));
                return (0, pointcut_1.applyPointcutAdvisors)(instance, simpleClassName || primaryKey, advisors);
            });
        }
        // DestroyMethods (via onDeactivation)
        if (comp.destroyMethods && comp.destroyMethods.length > 0) {
            for (const dm of comp.destroyMethods) {
                binding.onDeactivation((instance) => {
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
    resolveClass(className) {
        if (this.classRegistry.has(className)) {
            return this.classRegistry.get(className);
        }
        const simple = className.split(".").pop();
        if (simple && this.classRegistry.has(simple)) {
            return this.classRegistry.get(simple);
        }
        return undefined;
    }
    resolveArg(arg, container) {
        if (arg.componentName) {
            return container.get(arg.componentName);
        }
        if (arg.value !== undefined) {
            return this.parseValue(arg.value);
        }
        return undefined;
    }
    resolveProp(prop, container) {
        if (prop.componentName) {
            return container.get(prop.componentName);
        }
        if (prop.value !== undefined) {
            return this.parseValue(prop.value);
        }
        return undefined;
    }
    parseValue(val) {
        if (/^-?\d+(\.\d+)?$/.test(val)) {
            return Number(val);
        }
        if (val === "true")
            return true;
        if (val === "false")
            return false;
        return val;
    }
}
exports.DiconLoader = DiconLoader;
//# sourceMappingURL=diconLoader.js.map