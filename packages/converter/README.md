# Seasar2ts Converter

This package provides the conversion tools to migrate Seasar2/S2Dao assets to the Seasar2ts framework.

## Overview
The converter is designed to automate the transition from a Java-based Seasar2 environment to a TypeScript-based Seasar2ts environment. It doesn't just perform a simple syntax translation; it maps the structural essence of the original framework into the new one.

## Key Features
- **Java AST Parsing**: Utilizes `JavaParser` to analyze Java source code and extract structural metadata.
- **Intermediate Representation (IR)**: Converts Java source and configuration files into a structured JSON format representing the Seasar2 architecture.
- **TypeScript Generation**: Uses `ts-morph` to generate production-ready TypeScript code from the IR.
- **Multi-asset Support**:
  - **Java Source**: Converts `Action`, `Logic`, and `Dao` classes.
  - **dicon Files**: Parses XML configuration to set up the TypeScript container.
  - **SQL Files**: Maps `.sql` files to the `S2Dao` implementation in TypeScript.

## Pipeline
1. **Input**: `.java`, `.dicon`, `.sql`
2. **Analysis**: JavaParser & XML Parser $\rightarrow$ IR (JSON)
3. **Generation**: ts-morph $\rightarrow$ `.ts` files
4. **Output**: A runnable TypeScript application using `@seasar2ts/core`.

## Technologies
- **JavaParser**: For robust Java AST analysis.
- **ts-morph**: For programmatic TypeScript code generation.
- **Node.js**: The primary execution environment for the conversion CLI.
