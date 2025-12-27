import { FieldBuilder, ForeignKeyBuilder } from './field-builder';

/**
 * Type builder API for defining database schemas with a fluent interface.
 * Provides methods for creating various SQL-like field types with constraints.
 *
 * @example
 * ```typescript
 * import { t } from '@doviui/dev-db';
 *
 * const schema = {
 *   User: {
 *     $count: 100,
 *     id: t.bigserial().primaryKey(),
 *     email: t.varchar(255).unique().notNull().generate('internet.email'),
 *     age: t.integer().min(18).max(100),
 *     created_at: t.timestamptz().default('now')
 *   }
 * };
 * ```
 */
export const t = {
  // Numeric types

  /**
   * Creates a big integer field (64-bit).
   * @returns FieldBuilder instance for method chaining
   */
  bigint(): FieldBuilder {
    return new FieldBuilder('bigint');
  },

  /**
   * Creates an auto-incrementing big integer field.
   * Commonly used for primary keys.
   * @returns FieldBuilder instance for method chaining
   */
  bigserial(): FieldBuilder {
    return new FieldBuilder('bigserial');
  },

  /**
   * Creates a standard integer field (32-bit).
   * @returns FieldBuilder instance for method chaining
   */
  integer(): FieldBuilder {
    return new FieldBuilder('integer');
  },

  /**
   * Creates a small integer field (16-bit).
   * @returns FieldBuilder instance for method chaining
   */
  smallint(): FieldBuilder {
    return new FieldBuilder('smallint');
  },

  /**
   * Creates an auto-incrementing integer field.
   * @returns FieldBuilder instance for method chaining
   */
  serial(): FieldBuilder {
    return new FieldBuilder('serial');
  },

  /**
   * Creates a decimal/numeric field with specified precision and scale.
   * @param precision - Total number of digits
   * @param scale - Number of digits after the decimal point
   * @returns FieldBuilder instance for method chaining
   * @example t.decimal(10, 2) // e.g., 12345678.90
   */
  decimal(precision: number, scale: number): FieldBuilder {
    return new FieldBuilder('decimal', undefined, precision, scale);
  },

  /**
   * Creates a numeric field (alias for decimal).
   * @param precision - Total number of digits
   * @param scale - Number of digits after the decimal point
   * @returns FieldBuilder instance for method chaining
   */
  numeric(precision: number, scale: number): FieldBuilder {
    return new FieldBuilder('numeric', undefined, precision, scale);
  },

  /**
   * Creates a single-precision floating point field.
   * @returns FieldBuilder instance for method chaining
   */
  real(): FieldBuilder {
    return new FieldBuilder('real');
  },

  /**
   * Creates a double-precision floating point field.
   * @returns FieldBuilder instance for method chaining
   */
  double(): FieldBuilder {
    return new FieldBuilder('double');
  },

  // String types

  /**
   * Creates a variable-length character field.
   * @param length - Maximum length of the string
   * @returns FieldBuilder instance for method chaining
   * @example t.varchar(255)
   */
  varchar(length: number): FieldBuilder {
    return new FieldBuilder('varchar', length);
  },

  /**
   * Creates a fixed-length character field.
   * @param length - Fixed length of the string
   * @returns FieldBuilder instance for method chaining
   */
  char(length: number): FieldBuilder {
    return new FieldBuilder('char', length);
  },

  /**
   * Creates an unlimited text field.
   * @returns FieldBuilder instance for method chaining
   */
  text(): FieldBuilder {
    return new FieldBuilder('text');
  },

  // Date/Time types

  /**
   * Creates a date-only field (no time component).
   * @returns FieldBuilder instance for method chaining
   */
  date(): FieldBuilder {
    return new FieldBuilder('date');
  },

  /**
   * Creates a time-only field (no date component).
   * @returns FieldBuilder instance for method chaining
   */
  time(): FieldBuilder {
    return new FieldBuilder('time');
  },

  /**
   * Creates a timestamp field (date and time without timezone).
   * @returns FieldBuilder instance for method chaining
   */
  timestamp(): FieldBuilder {
    return new FieldBuilder('timestamp');
  },

  /**
   * Creates a timestamp field with timezone support.
   * @returns FieldBuilder instance for method chaining
   */
  timestamptz(): FieldBuilder {
    return new FieldBuilder('timestamptz');
  },

  // Other types

  /**
   * Creates a boolean field (true/false).
   * @returns FieldBuilder instance for method chaining
   */
  boolean(): FieldBuilder {
    return new FieldBuilder('boolean');
  },

  /**
   * Creates a UUID field (universally unique identifier).
   * @returns FieldBuilder instance for method chaining
   */
  uuid(): FieldBuilder {
    return new FieldBuilder('uuid');
  },

  /**
   * Creates a JSON field for storing structured data.
   * @returns FieldBuilder instance for method chaining
   */
  json(): FieldBuilder {
    return new FieldBuilder('json');
  },

  /**
   * Creates a binary JSON field (JSONB).
   * More efficient for querying than regular JSON.
   * @returns FieldBuilder instance for method chaining
   */
  jsonb(): FieldBuilder {
    return new FieldBuilder('jsonb');
  },

  // Relationships

  /**
   * Creates a foreign key reference to another table.
   * @param table - The referenced table name
   * @param column - The referenced column name
   * @returns ForeignKeyBuilder instance for method chaining
   * @example t.foreignKey('User', 'id').notNull()
   */
  foreignKey(table: string, column: string): ForeignKeyBuilder {
    return new ForeignKeyBuilder(table, column);
  },
};
