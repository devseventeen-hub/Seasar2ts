# Usage Guide: Seasar2ts Converter

This document describes how to use the `Seasar2ts Converter` to migrate your existing Seasar2/S2Dao assets to the Seasar2ts framework.

## Prerequisites

Before using the converter, ensure your environment meets the following requirements:
- **Node.js**: Version 22.23.4 or higher (Node 22 LTS recommended).
- **Java Runtime**: JDK 1.8 or higher (required for the `JavaParser` component). JDK 17 or later  recommended.
- **Source Assets**: A collection of `.java`, `.dicon`, and `.sql` files from your Seasar2 project.

## Basic Workflow

The conversion process follows a three-step pipeline: **Analysis $\rightarrow$ Intermediate Representation (IR) $\rightarrow$ Generation**.

### 1. Prepare Source Assets
Collect your source files into a directory. For example:
```text
source_dir/
  ├── src/main/java/com/example/action/XxxAction.java
  ├── src/main/resources/dicon/app.dicon
  └── src/main/resources/sql/XxxDao.sql
```

### 2. Run the Converter
Execute the converter CLI tool. The tool will analyze the Java AST, parse the dicon files, and generate the corresponding TypeScript code.

```bash
# Example command (actual command may vary based on final CLI implementation)
npx @seasar2ts/converter --input ./source_dir --output ./output_dir
```

### 3. Review Generated Code
The converter will produce a structured project in the `output_dir`:
- `src/action/`: Generated Action and Form classes (`*Action.ts`, `*Form.ts`).
- `src/logic/`: Generated Logic classes.
- `src/dao/`: Generated DAO implementations.
- `src/entity/`: Generated POJO/Bean equivalents.
- `src/dicon/`: Generated TypeScript container configuration files from `.dicon` (e.g., `app.dicon.ts` with `configureAppContainer`).
- `src/sql/`: Re-positioned `.sql` files.
- `src/container.ts`: The initialized InversifyJS container.
- `docs/api-catalog.md`: Standard API & Type Catalog document (Markdown) detailing all Action endpoints, typed parameters, models, and JavaDoc descriptions for human inspection and AI UI regeneration.
- `docs/api-spec.json`: OpenAPI 3.0 / JSON Schema specification file for API tooling, Swagger, and frontend SDK generation.

## Example Scenario

To convert a simple "User Management" module:

1. **Input**: Provide the `UserAction.java`, `UserLogic.java`, `UserDao.java`, and `user.sql`.
2. **Execution**: Run the converter.
3. **Result**: You receive a ready-to-run TypeScript application where `UserAction` is automatically injected into `UserLogic`, and `UserDao` handles SQL execution via the `@seasar2ts/core` runtime.

## Troubleshooting
- **JavaParser Errors**: Ensure `JAVA_HOME` is correctly set if the parser fails to initialize.
- **Mapping Issues**: If a specific SQL query is not mapped correctly, check the `.sql` file naming convention to ensure it matches the expected `S2Dao` patterns.
- **dicon Parsing Errors**: Ensure the `.dicon` file follows the standard Seasar2 nested container XML structure for correct hierarchy detection.
- **Conversion Logic Errors**: If AOP or DI rules are not correctly mapped, verify the source configuration in the `.dicon` file.
- **JDBC Configuration Analysis Errors**: Ensure that `jdbc.dicon` contains the required properties (`driverClassName`, `url`, `user`, `password`) and optional DBCP pool settings (`maxActive`, `minIdle`, `maxWait`, `maxIdle`), and that the file path is correctly specified.
- **Dialect Mismatch**: If the generated SQL uses incorrect placeholder formats (e.g., `?` for SQLite/MySQL vs. `$1, $2...` for PostgreSQL), verify that the correct `DbDialect` is being identified from the JDBC URL or configuration.
- **Lifecycle Method Errors**: If `<initMethod>` or `<destroyMethod>` are not executed correctly, verify that the method names in the `.dicon` file match the class definitions and that the component scope is correctly configured.
- **Metadata Mapping Issues**: If `<meta>` tags are not correctly reflected in the generated code, ensure the tag names and attribute values in the `.dicon` file are accurate.
- **Connection Pool Configuration Errors**: If using PostgreSQL or MySQL connection pooling, ensure DBCP properties (such as `maxActive`, `minIdle`, `maxWait`) in `jdbc.dicon` or pool configuration in TypeScript are within valid ranges.