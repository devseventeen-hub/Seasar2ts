# Seasar2ts

Seasar2ts is a framework and a conversion tool designed to bring the core architectural essence of Seasar2 and S2Dao into the TypeScript ecosystem.

## Overview
Seasar2ts aims to replicate the core features of Seasar2 in TypeScript:
- **Convention over Configuration**: A rule-based approach to reduce boilerplate.
- **Lightweight DI**: Powered by InversifyJS with automatic binding based on naming conventions.
- **SQL-first DAO (S2Dao)**: Support for external `.sql` files, automatic parameter binding, and `Bean` mapping.
- **Declarative AOP**: Proxy-based interceptors for transaction management (`TxInterceptor`) and logging.
- **dicon Support**: Parsing `.dicon` files for configuration and aspect application.

## Components
- **@seasar2ts/core**: The core runtime library providing DI, AOP, and DAO infrastructure.
- **@seasar2ts/converter**: A tool to automatically migrate Java/Seasar2 assets (Java, dicon, SQL) to TypeScript using JavaParser and ts-morph.

## Project Structure
- `packages/core`: Runtime library.
- `packages/converter`: Conversion tools.
- `examples/`: Sample projects for both original Java and converted TypeScript applications.
