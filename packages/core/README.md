# Core Module Overview

The `packages/core` module provides the foundational infrastructure for the Seasar2ts framework. It implements core Seasar2 concepts in TypeScript, including Aspect-Oriented Programming (AOP), Dependency Injection (DI), and Data Access Object (DAO) mapping.

## Key Features

### 1. AOP (Aspect-Oriented Programming)
Provides a Proxy-based AOP implementation similar to Seasar2's `MethodInterceptor`.
- **Interceptors**: Define cross-cutting concerns (e.g., logging, transaction management).
- **Transaction Management**: The `TxInterceptor` manages transaction boundaries by interacting with the `Database` interface, ensuring that transaction logic remains decoupled from specific database implementations.
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
- **Bean Mapping**: Automatically maps `snake_case` database columns to `camelCase` properties.
- **Prefix Handling**: Supports stripping prefixes (e.g., `user_name` $\rightarrow$ `name`) to simplify entity definitions.
- **Automatic Query Generation**: Generates standard queries (e.g., `selectById`) from method names and bean properties.
- **Location**: `packages/core/src/dao/`

### 4. Multi-Database Support
Provides a dialect-aware execution engine to support multiple database types (e.g., SQLite, PostgreSQL).
- **DB Abstraction**: Decouples business logic from database-specific details using `DbConnection` and `DbDialect` interfaces.
- **Dialect-Aware Execution**: Automatically handles database-specific differences, such as placeholder formats (`?` vs `$1, $2...`) and identifier quoting, via the `DbDialect` layer.
- **Location**: `packages/core/src/dao/drivers/`

### 5. Dicon Parsing & Bootstrap
Provides utilities to parse `.dicon` files, enabling the seamless migration of Seasar2 configuration into the TypeScript environment.
- **Nested Container Mapping**: Supports mapping the hierarchical container structures defined in `.dicon` files.
- **DataSource Extraction**: Automatically parses `jdbc.dicon` to extract critical connection parameters including `driverClassName`, `url`, `user`, and `password`.
- **Automatic Driver Initialization**: Bridges the gap between Seasar2 configuration and the TypeScript runtime by automatically generating the appropriate Driver initialization code based on the parsed JDBC settings.
- **Location**: `packages/core/src/dicon/`

## Architecture Overview

The core module acts as the engine that powers the generated code. While the `converter` handles the transformation of Java source code, `core` provides the runtime capabilities:

- **aop**: Handles the execution flow of intercepted methods, including transaction management.
- **container**: Manages the lifecycle and injection of components, supporting hierarchical structures.
- **dao**: Handles the translation between raw SQL results and typed objects.
- **Multi-Database Support**: Utilizing a dialect-aware execution engine to support multiple database types (SQLite, PostgreSQL, etc.).
- **dicon**: Bridges the gap between Seasar2 configuration and TypeScript by automatically mapping JDBC settings to the runtime environment.