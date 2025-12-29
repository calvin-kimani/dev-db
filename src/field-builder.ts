import type { Faker } from '@faker-js/faker';
import type { FieldConfig, FieldBuilderLike, JsonSchema } from './types';

export type Generator = string | ((faker: Faker) => any);

/**
 * Builder class for defining database field configurations with a fluent API.
 *
 * @example
 * ```typescript
 * const field = new FieldBuilder('varchar', 255)
 *   .unique()
 *   .notNull()
 *   .generate('internet.email');
 * ```
 */
export class FieldBuilder implements FieldBuilderLike {
  protected config: FieldConfig;

  /**
   * Creates a new FieldBuilder instance.
   *
   * @param type - The SQL-like type of the field
   * @param length - Optional length for string types
   * @param precision - Optional precision for numeric types
   * @param scale - Optional scale for numeric types
   */
  constructor(type: string, length?: number, precision?: number, scale?: number) {
    this.config = {
      type,
      length,
      precision,
      scale,
      nullable: true,
    };
  }

  /**
   * Marks this field as a primary key.
   * Automatically sets notNull to true and nullable to false.
   *
   * @returns The builder instance for chaining
   */
  primaryKey(): this {
    this.config.primaryKey = true;
    this.config.notNull = true;
    this.config.nullable = false;
    return this;
  }

  /**
   * Enforces uniqueness constraint on this field.
   * All generated values will be unique.
   *
   * @returns The builder instance for chaining
   */
  unique(): this {
    this.config.unique = true;
    return this;
  }

  /**
   * Marks this field as NOT NULL.
   * Generated values will never be null.
   *
   * @returns The builder instance for chaining
   */
  notNull(): this {
    this.config.notNull = true;
    this.config.nullable = false;
    return this;
  }

  /**
   * Marks this field as nullable.
   * Generated values may occasionally be null (10% chance by default).
   *
   * @returns The builder instance for chaining
   */
  nullable(): this {
    this.config.nullable = true;
    this.config.notNull = false;
    return this;
  }

  /**
   * Sets a default value for this field.
   *
   * @param value - The default value. Use 'now' for current timestamp.
   * @returns The builder instance for chaining
   *
   * @example
   * ```typescript
   * t.boolean().default(true)
   * t.timestamptz().default('now')
   * ```
   */
  default(value: any): this {
    this.config.default = value;
    return this;
  }

  /**
   * Sets the minimum value for numeric fields.
   *
   * @param value - Minimum allowed value
   * @returns The builder instance for chaining
   */
  min(value: number): this {
    this.config.min = value;
    return this;
  }

  /**
   * Sets the maximum value for numeric fields.
   *
   * @param value - Maximum allowed value
   * @returns The builder instance for chaining
   */
  max(value: number): this {
    this.config.max = value;
    return this;
  }

  /**
   * Restricts field values to a specific set of allowed values.
   *
   * @param values - Array of allowed values
   * @returns The builder instance for chaining
   *
   * @example
   * ```typescript
   * t.varchar(20).enum(['draft', 'published', 'archived'])
   * ```
   */
  enum(values: any[]): this {
    this.config.enum = values;
    return this;
  }

  /**
   * Sets a custom generator for field values.
   *
   * @param generator - Either a Faker.js method path or a custom function
   * @returns The builder instance for chaining
   *
   * @example
   * ```typescript
   * // Using Faker.js method
   * t.varchar(100).generate('internet.email')
   *
   * // Using custom function
   * t.varchar(20).generate((faker) =>
   *   faker.helpers.arrayElement(['red', 'blue', 'green'])
   * )
   * ```
   */
  generate(generator: Generator): this {
    this.config.generator = generator;
    return this;
  }

  /**
   * Sets a nested schema for JSON/JSONB fields.
   * Defines the structure and types of properties within the JSON object.
   *
   * @param schema - The JSON schema defining nested fields
   * @returns The builder instance for chaining
   *
   * @example
   * ```typescript
   * t.json({
   *   userId: t.integer(),
   *   preferences: t.json({
   *     theme: t.varchar(20),
   *     notifications: t.boolean()
   *   })
   * })
   * ```
   */
  withJsonSchema(schema: JsonSchema): this {
    this.config.jsonSchema = schema;
    return this;
  }

  /**
   * Converts the builder to a plain FieldConfig object.
   *
   * @returns The field configuration
   */
  toConfig(): FieldConfig {
    return this.config;
  }
}

/**
 * Builder class for foreign key fields.
 * Extends FieldBuilder with foreign key-specific configuration.
 */
export class ForeignKeyBuilder extends FieldBuilder {
  /**
   * Creates a new foreign key field builder.
   *
   * @param table - The referenced table name
   * @param column - The referenced column name
   */
  constructor(table: string, column: string) {
    super('foreignKey');
    this.config.foreignKey = { table, column };
  }
}

/**
 * Builder class for belongsTo relationships.
 * Alias for ForeignKeyBuilder with clearer intent for many-to-one relationships.
 */
export class BelongsToBuilder extends FieldBuilder {
  /**
   * Creates a new belongsTo relationship builder.
   *
   * @param table - The referenced table name
   * @param foreignKey - The foreign key field name in the current table
   */
  constructor(table: string, foreignKey: string) {
    super('belongsTo');
    this.config.belongsTo = { table, foreignKey };
  }
}

/**
 * Builder class for hasMany relationships.
 * Defines one-to-many relationships. This is a virtual field that doesn't appear in output
 * but controls how related records are generated.
 */
export class HasManyBuilder extends FieldBuilder {
  /**
   * Creates a new hasMany relationship builder.
   *
   * @param table - The related table name
   * @param foreignKey - The foreign key field name in the related table
   * @param options - Min/max constraints for how many related records to generate
   */
  constructor(table: string, foreignKey: string, options?: { min?: number; max?: number }) {
    super('hasMany');
    this.config.hasMany = {
      table,
      foreignKey,
      min: options?.min,
      max: options?.max
    };
  }
}
