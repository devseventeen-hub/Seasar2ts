# Seasar2ts Converter

This package provides the conversion tools to migrate Seasar2/S2Dao assets to the Seasar2ts framework.

## Overview
The converter is designed to automate the transition from a Java-based Seasar2 environment to a TypeScript-based Seasar2ts environment. Beyond simple syntax translation, it maps the structural essence of the original framework into the new one, including **dialect-aware conversion** that accounts for database-specific nuances (e.g., SQLite vs. PostgreSQL).

## Key Features
- **Java AST Parsing**: Utilizes `JavaParser` to analyze Java source code and extract structural metadata.
- **Intermediate Representation (IR)**: Converts Java source and configuration files into a structured JSON format representing the Seasar2 architecture.
- **Dialect-Aware Generation**: Generates TypeScript code that automatically handles database-specific differences, such as placeholder formats (`?` vs. `$1, $2...`) and identifier quoting.
- **JDBC Configuration Analysis**: Automatically parses `jdbc.dicon` to extract connection parameters and generate the corresponding Driver initialization code.
- **TypeScript Generation**: Uses `ts-morph` to generate production-ready TypeScript code from the IR.

## Multi-asset Support
- **Java Source**: Converts `Action`, `Logic`, and `Dao` classes while preserving Seasar2 conventions.
- **dicon**: Translates nested containers, pointcut expressions, and **JDBC DataSource configurations** into TypeScript equivalents.
- **SQL**: Handles manual SQL files and generates TypeScript DAO methods for automatic queries (e.g., `selectById`).

## Pipeline
1. **Input**: `.java`, `.dicon`, `.sql`
2. **Analysis**: JavaParser & XML Parser $\rightarrow$ **JDBC Configuration Analysis** $\rightarrow$ IR (JSON)
3. **Generation**: **Dialect-specific Code Generation** $\rightarrow$ ts-morph $\rightarrow$ `.ts` files
4. **Output**: A runnable TypeScript application using `@seasar2ts/core`.

## Role in Ecosystem
The `converter` is responsible for **Static Transformation**: it takes existing Java assets and produces the TypeScript source code. In contrast, the `core` module provides the **Dynamic Runtime**: it handles the execution, dependency injection, and database interaction of the generated code.

## Technologies
- **JavaParser**: For robust Java AST analysis.
- **ts-morph**: For programmatic TypeScript code generation.
- **Node.js**: The primary execution environment for the conversion CLI.
