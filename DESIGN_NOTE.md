The primary difference between Seasar2 and Seasar2ts lies in the implementation approach regarding **"how to faithfully reproduce Seasar2's philosophy (lightweight DI, AOP, and SQL-first DAO) using the TypeScript technology stack (InversifyJS, ts-morph, etc.)."**

Specifically, Seasar2's features have been optimized and adapted for TypeScript in the following areas:

## 1. DI (Dependency Injection)
- Seasar2: Uses `@Component` and `@Binding`; supports Setter/Field Injection.
- Seasar2ts: Based on InversifyJS, using `@injectable` and `@inject`. To align with TypeScript characteristics, Setter/Field Injection is converted to Constructor Injection.

## 2. AOP (Aspect-Oriented Programming)
- Seasar2: Defined using `@Aspect` or `<aspect>` tags in dicon files with optional pointcuts.
- Seasar2ts: Uses wrappers based on `Proxy` and `PointcutAdvisor`. It dynamically applies method-pattern matching via `applyPointcutAdvisors` and `applyInterceptors`, and integrates with Inversify's lifecycle hooks (`onActivation` / `onDeactivation`) for `<initMethod>` and `<destroyMethod>`.

## 3. DAO (Data Access)
- Seasar2: Uses S2Dao, linking components via `@Sql` annotations and dicon configurations.
- Seasar2ts: Inherits the SQL-first philosophy while automatically generating TypeScript concrete classes from Java-style DAO interfaces. It automates the mapping from `ResultSet` to Beans using methods like `loadSql` and `mapRowToBean`, with dialect-aware execution (SQLite, PostgreSQL, MySQL).

## 4. Handling Configuration (dicon)
- Seasar2: Components and aspects are defined in XML-based dicon files.
- Seasar2ts: Completely maps `.dicon` XML tags (`<components>`, `<include>`, `<component>`, `<arg>`, `<property>`, `<aspect>`, `<initMethod>`, `<destroyMethod>`, `<meta>`) into TypeScript container initialization code. Provides both build-time code generation (`DiconTsGenerator`) and runtime dynamic loading (`DiconLoader`) on `S2HierarchicalContainer`.

## 5. Naming Conventions and Auto-registration
- Seasar2: Auto-registration based on package structure (e.g., `com.example.action`). 
- Seasar2ts: It maps to a TypeScript directory structure (such as `src/action/`) and employs a mechanism that automatically registers class names as tokens using the `autoBind` function.

## 6. DB Connection Pooling
- Seasar2: Uses DBCP (Database Connection Pool) via `jdbc.dicon` configurations.
- Seasar2ts: Introduces a `DbConnectionPool` abstraction with drivers for PostgreSQL (`PostgresPoolDriver`) and MySQL (`MySQLPoolDriver`). It automatically extracts DBCP pool configurations (`maxActive`, `minIdle`, `maxWait`, `maxIdle`) from `jdbc.dicon`, and coordinates with `TxInterceptor` to lease connections during transactions and guarantee return to the pool upon commit/rollback to prevent connection leaks.

## 7. Action & Web Layer
- Seasar2: SA-Struts / Teeda Controllers returning view paths or forwards/redirects tightly coupled to JSP.
- Seasar2ts: Recreates Action execution through `ActionResult` (`view`, `redirect`, `json`) and a web-framework-agnostic router (`S2HttpRouter`, `createHttpHandler`) that easily plugs into Express, Fastify, Next.js route handlers, or Node.js native `http.createServer`.

## 8. Frontend Regeneration Support & Deterministic API Catalog
- Seasar2: JavaDoc documented technical Java signatures but lacked actionable API/screen contracts.
- Seasar2ts: Leaves legacy JSP parsing to dedicated frontend projects to maintain a focused, robust backend engine. In its place, the converter generates deterministic API/Type contracts (`docs/api-catalog.md` and `docs/api-spec.json`) and TSDoc comments, providing unambiguous specifications for AI agents (LLMs) and developers to rebuild modern frontends (React, Vue, Next.js).

Summary
Seasar2ts is not merely a port; it is designed as a framework that **"reconstructs the spirit of Seasar2 (lightweight, automation, and SQL-first) within the TypeScript ecosystem."**