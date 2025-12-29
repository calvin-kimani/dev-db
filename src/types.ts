import type { Faker } from '@faker-js/faker';

/**
 * A generator function or Faker.js method path for generating field values.
 *
 * @example
 * ```typescript
 * // Using Faker.js method path
 * 'internet.email'
 *
 * // Using custom function
 * (faker) => faker.helpers.arrayElement(['red', 'blue', 'green'])
 * ```
 */
export type Generator = string | ((faker: Faker) => any);

/**
 * Configuration for a database field, defining its type, constraints, and generation rules.
 */
export interface FieldConfig {
  /** The SQL-like type of the field (e.g., 'varchar', 'integer', 'uuid') */
  type: string;

  /** Maximum length for string types */
  length?: number;

  /** Precision for numeric types */
  precision?: number;

  /** Scale (decimal places) for numeric types */
  scale?: number;

  /** Whether this field is a primary key */
  primaryKey?: boolean;

  /** Whether values must be unique across all records */
  unique?: boolean;

  /** Whether null values are not allowed */
  notNull?: boolean;

  /** Whether null values are allowed (default: true) */
  nullable?: boolean;

  /** Default value for the field. Use 'now' for current timestamp */
  default?: any;

  /** Minimum value for numeric types */
  min?: number;

  /** Maximum value for numeric types */
  max?: number;

  /** Array of allowed values for enum fields */
  enum?: any[];

  /** Foreign key reference to another table */
  foreignKey?: { table: string; column: string };

  /** One-to-many relationship definition (virtual field, not in output) */
  hasMany?: { table: string; foreignKey: string; min?: number; max?: number };

  /** Many-to-one relationship definition (alias for foreignKey with clearer intent) */
  belongsTo?: { table: string; foreignKey: string };

  /** Custom generator function or Faker.js method path */
  generator?: Generator;

  /** Nested JSON schema for json/jsonb types */
  jsonSchema?: JsonSchema;
}

/**
 * Schema definition for JSON fields, mapping property names to field configurations.
 */
export interface JsonSchema {
  [fieldName: string]: FieldConfig | FieldBuilderLike;
}

/**
 * Configuration for a database table, including field definitions and record count.
 */
export interface TableConfig {
  /** Number of records to generate for this table */
  $count?: number;

  /** Field definitions - can be FieldConfig objects or FieldBuilder instances */
  [fieldName: string]: FieldConfig | FieldBuilderLike | number | undefined;
}

/**
 * Interface for objects that can be converted to FieldConfig.
 * Allows FieldBuilder instances to be used directly in schemas.
 */
export interface FieldBuilderLike {
  /** Converts the builder to a FieldConfig object */
  toConfig(): FieldConfig;
}

/**
 * Complete schema definition mapping table names to their configurations.
 *
 * @example
 * ```typescript
 * const schema: Schema = {
 *   User: {
 *     $count: 100,
 *     id: t.bigserial().primaryKey(),
 *     email: t.varchar(255).unique().notNull(),
 *     age: t.integer().min(18).max(100)
 *   },
 *   Post: {
 *     $count: 500,
 *     id: t.bigserial().primaryKey(),
 *     user_id: t.foreignKey('User', 'id'),
 *     title: t.varchar(200)
 *   }
 * };
 * ```
 */
export interface Schema {
  [tableName: string]: TableConfig;
}
