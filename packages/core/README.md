# Core Module Overview

The `packages/core` module provides the foundational infrastructure for the Seasar2ts framework. It implements core Seasar2 concepts in TypeScript, including Aspect-Oriented Programming (AOP), Dependency Injection (DI), and Data Access Object (DAO) mapping.

## Key Features

### 1. AOP (Aspect-Oriented Programming)
Provides a Proxy-based AOP implementation similar to Seasar2's `MethodInterceptor`.
- **Interceptors**: Define cross-cutting concerns (e.g., logging, transaction management).
- **Proxy Generation**: Automatically wraps target objects with a chain of interceptors.
- **Pointcut Expressions**: Supports method-pattern matching (e.g., `UserService.*`) for granular interceptor application.
- **Location**: `packages/core/src/aop/`

### 2. Dependency Injection (DI)
Provides a standard DI container based on `inversify`.
- **Container**: A Seasar2-style container that supports Singleton scope by default.
- **Auto-binding**: Simplifies the wiring of components.
- **Hierarchical Containers**: Supports nested container structures for managing different contexts (e.g., `Web` vs. `Batch`).
- **Location**: `packages/core/src/container/`

### 3. DAO & Mapping
Provides the runtime layer for S2Dao-style SQL execution and bean mapping.
- **Bean Mapping**: Converts `snake_case` columns to `camelCase` properties and supports prefix stripping.
- **SQL Runtime**: Loads external `.sql` files, binds parameters, and maps result sets to typed objects.
- **Role Separation**: Query generation (e.g., `selectById`) is handled by the `converter`; the core module focuses solely on execution and mapping.
- **Location**: `packages/core/src/dao/`

### 4. Dicon Parsing
Provides utilities to parse `.dicon` files, enabling the migration of Seasar2 configuration into the TypeScript environment.
- **Nested Container Mapping**: Supports mapping the hierarchical container structures defined in `.dicon` files.
- **Location**: `packages/core/src/dicon/`

## Architecture Overview

The core module acts as the engine that powers the generated code. While the `converter` handles the transformation of Java source code, `core` provides the runtime capabilities:

- **aop**: Handles the execution flow of intercepted methods.
- **container**: Manages the lifecycle and injection of components.
- **dao**: Handles the translation between raw SQL results and typed objects.
- **dicon**: Bridges the gap between Seasar2 configuration and TypeScript.