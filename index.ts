/**
 * @doviui/dev-db - Generate realistic mock JSON databases from TypeScript schemas
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { t, MockDataGenerator, SchemaValidator } from '@doviui/dev-db';
 *
 * // Define schema
 * const schema = {
 *   User: {
 *     $count: 100,
 *     id: t.bigserial().primaryKey(),
 *     email: t.varchar(255).unique().notNull().generate('internet.email'),
 *     age: t.integer().min(18).max(100)
 *   }
 * };
 *
 * // Validate schema
 * const validator = new SchemaValidator();
 * const errors = validator.validate(schema);
 *
 * // Generate data
 * const generator = new MockDataGenerator(schema, {
 *   outputDir: './mock-data',
 *   seed: 42
 * });
 * await generator.generate();
 * ```
 */

// Re-export public API
export { t } from './src/schema-builder';
export { MockDataGenerator } from './src/generator';
export { SchemaValidator } from './src/validator';
export type { Schema, TableConfig, FieldConfig, Generator } from './src/types';
export type { ValidationError } from './src/validator';
export type { GeneratorOptions } from './src/generator';
