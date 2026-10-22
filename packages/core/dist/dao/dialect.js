"use strict";
/**
 * データベース方言 (Dialect) の抽象インターフェースおよび標準実装
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDialect = exports.MySQLDialect = exports.PostgresDialect = exports.SQLiteDialect = void 0;
/**
 * SQLite 用方言
 */
class SQLiteDialect {
    name = "sqlite";
    formatPlaceholder(_index) {
        return "?";
    }
    quoteIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }
}
exports.SQLiteDialect = SQLiteDialect;
/**
 * PostgreSQL 用方言
 */
class PostgresDialect {
    name = "postgresql";
    formatPlaceholder(index) {
        return `$${index}`;
    }
    quoteIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }
}
exports.PostgresDialect = PostgresDialect;
/**
 * MySQL / MariaDB 用方言 (将来拡張用)
 */
class MySQLDialect {
    name = "mysql";
    formatPlaceholder(_index) {
        return "?";
    }
    quoteIdentifier(identifier) {
        return `\`${identifier.replace(/`/g, "``")}\``;
    }
}
exports.MySQLDialect = MySQLDialect;
exports.defaultDialect = new SQLiteDialect();
//# sourceMappingURL=dialect.js.map