# Usage Guide: Seasar2ts Converter

This document describes how to use the `Seasar2ts Converter` to migrate your existing Seasar2/S2Dao assets to the Seasar2ts framework.

## Prerequisites

Before using the converter, ensure your environment meets the following requirements:
- **Node.js**: Version 20.x or higher (LTS recommended).
- **Java Runtime**: JDK 1.8 or higher (required for the `JavaParser` component).
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
The converter will produce a structured TypeScript project in the `output_dir`:
- `src/action/`: Generated Action classes.
- `src/logic/`: Generated Logic classes.
- `src/dao/`: Generated DAO implementations.
- `src/entity/`: Generated POJO/Bean equivalents.
- `src/sql/`: Re-positioned `.sql` files.
- `src/container.ts`: The initialized InversifyJS container.

## Example Scenario

To convert a simple "User Management" module:

1. **Input**: Provide the `UserAction.java`, `UserLogic.java`, `UserDao.java`, and `user.sql`.
2. **Execution**: Run the converter.
3. **Result**: You receive a ready-to-run TypeScript application where `UserAction` is automatically injected into `UserLogic`, and `UserDao` handles SQL execution via the `@seasar2ts/core` runtime.

## Troubleshooting
- **JavaParser Errors**: Ensure `JAVA_HOME` is correctly set if the parser fails to initialize.
- **Mapping Issues**: If a specific SQL query is not mapped correctly, check the `.sql` file naming convention to ensure it matches the expected `S2Dao` patterns.
