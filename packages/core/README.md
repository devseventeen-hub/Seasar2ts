# Core Module Overview

The `packages/core` module provides the foundational infrastructure for the Seasar2ts framework. It implements core Seasar2 concepts in TypeScript, including Aspect-Oriented Programming (AOP), Dependency Injection (DI), and Data Access Object (DAO) mapping.

## Key Features

### 1. AOP (Aspect-Oriented Programming)
Provides a Proxy-based AOP implementation similar to Seasar2's `MethodInterceptor`.
- **Interceptors**: Define cross-cutting concerns (e.g., logging, transaction management).
- **Proxy Generation**: Automatically wraps target objects with a chain of interceptors.
- **Location**: `packages/core/src/aop/`

### 2. Dependency Injection (DI)
Provides a standard DI container based on `inversify`.
- **Container**: A Seasar2-style container that supports Singleton scope by default.
- **Auto-binding**: Simplifies the wiring of components.
- **Location**: `packages/core/src/container/`

### 3. DAO & Mapping
Implements automatic mapping between database result sets and TypeScript objects.
- **Bean Mapping**: Automatically maps `snake_case` database columns to `camelCase` properties.
- **Prefix Handling**: Supports stripping prefixes (e.g., `user_name` $\rightarrow$ `name`) to simplify entity definitions.
- **Location**: `packages/core/src/dao/`

### 4. Dicon Parsing
Provides utilities to parse `.dicon` files, enabling the migration of Seasar2 configuration into the TypeScript environment.
- **Location**: `packages/core/src/dicon/`

## Architecture Overview

The core module acts as the engine that powers the generated code. While the `converter` handles the transformation of Java source code, `core` provides the runtime capabilities:

- **aop**: Handles the execution flow of intercepted methods.
- **container**: Manages the lifecycle and injection of components.
- **dao**: Handles the translation between raw SQL results and typed objects.
- **dicon**: Bridges the gap between Seasar2 configuration and TypeScript.