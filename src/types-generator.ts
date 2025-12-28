import type { Schema, FieldConfig, TableConfig } from './types';

/**
 * Options for configuring the TypeScript types generator.
 */
export interface TypesGeneratorOptions {
  /** Directory where the types file will be saved (default: './mock-data') */
  outputDir?: string;

  /** Name of the generated types file (default: 'types.ts') */
  fileName?: string;
}

/**
 * Generates TypeScript type definitions from dev-db schemas.
 *
 * Features:
 * - Converts field types to TypeScript types
 * - Handles nullable and optional fields
 * - Generates interfaces for each table
 * - Creates a single types file for easy importing
 *
 * @example
 * ```typescript
 * const generator = new TypesGenerator(schema, {
 *   outputDir: './mock-data',
 *   fileName: 'types.ts'
 * });
 *
 * await generator.generate();
 * // Creates ./mock-data/types.ts with all interfaces
 * ```
 */
export class TypesGenerator {
  private schema: Schema;
  private options: TypesGeneratorOptions;

  /**
   * Creates a new TypeScript types generator.
   *
   * @param schema - The schema definition
   * @param options - Generator options
   */
  constructor(schema: Schema, options: TypesGeneratorOptions = {}) {
    this.schema = schema;
    this.options = {
      outputDir: options.outputDir || './mock-data',
      fileName: options.fileName || 'types.ts',
    };
  }

  /**
   * Generates TypeScript type definitions for all tables in the schema.
   *
   * Creates a single .ts file with interface definitions that match
   * the structure of the generated JSON data.
   *
   * @returns Promise resolving when the types file is written
   *
   * @example
   * ```typescript
   * await generator.generate();
   * // Creates ./mock-data/types.ts
   * ```
   */
  async generate(): Promise<void> {
    const interfaces: string[] = [];

    // Generate interface for each table
    for (const [tableName, tableConfig] of Object.entries(this.schema)) {
      const interfaceCode = this.generateInterface(tableName, tableConfig);
      interfaces.push(interfaceCode);
    }

    // Combine all interfaces into a single file
    const fileContent = interfaces.join('\n\n');

    // Write to file
    const outputPath = `${this.options.outputDir}/${this.options.fileName}`;
    await Bun.write(outputPath, fileContent);
  }

  private generateInterface(tableName: string, tableConfig: TableConfig): string {
    const fields: string[] = [];

    // Process each field
    for (const [fieldName, field] of Object.entries(tableConfig)) {
      // Skip the $count property
      if (fieldName === '$count') continue;

      const fieldConfig = this.toFieldConfig(field);
      if (!fieldConfig) continue;

      const fieldDeclaration = this.generateFieldDeclaration(fieldName, fieldConfig);
      fields.push(`  ${fieldDeclaration};`);
    }

    // Generate interface
    return `export interface ${tableName} {\n${fields.join('\n')}\n}`;
  }

  private generateFieldDeclaration(fieldName: string, fieldConfig: FieldConfig): string {
    const tsType = this.mapFieldTypeToTypeScript(fieldConfig);
    const isOptional = this.isFieldOptional(fieldConfig);
    const isNullable = this.isFieldNullable(fieldConfig);

    let declaration = fieldName;

    // Add optional marker if needed
    if (isOptional) {
      declaration += '?';
    }

    declaration += ': ';

    // Add type
    declaration += tsType;

    // Add null union if nullable (but only if not already optional with a default)
    if (isNullable && !(isOptional && fieldConfig.default !== undefined)) {
      declaration += ' | null';
    }

    return declaration;
  }

  private mapFieldTypeToTypeScript(fieldConfig: FieldConfig): string {
    // Handle foreign keys by looking up the referenced column type
    if (fieldConfig.foreignKey) {
      const refTable = fieldConfig.foreignKey.table;
      const refColumn = fieldConfig.foreignKey.column;

      const refTableConfig = this.schema[refTable];
      if (refTableConfig) {
        const refFieldConfig = this.toFieldConfig(refTableConfig[refColumn]);
        if (refFieldConfig) {
          return this.mapBasicTypeToTypeScript(refFieldConfig.type);
        }
      }

      // Fallback if reference not found
      return 'any';
    }

    return this.mapBasicTypeToTypeScript(fieldConfig.type);
  }

  private mapBasicTypeToTypeScript(type: string): string {
    switch (type) {
      case 'bigint':
      case 'bigserial':
      case 'integer':
      case 'smallint':
      case 'serial':
      case 'decimal':
      case 'numeric':
      case 'real':
      case 'double':
        return 'number';

      case 'varchar':
      case 'char':
      case 'text':
      case 'uuid':
        return 'string';

      case 'boolean':
        return 'boolean';

      case 'date':
      case 'time':
      case 'timestamp':
      case 'timestamptz':
        return 'string'; // ISO format strings

      case 'json':
      case 'jsonb':
        return 'any'; // Could be `object` or a generic type parameter in the future

      default:
        return 'any';
    }
  }

  private isFieldOptional(fieldConfig: FieldConfig): boolean {
    // A field is optional if it has a default value
    // This means it doesn't need to be provided when creating the object
    return fieldConfig.default !== undefined;
  }

  private isFieldNullable(fieldConfig: FieldConfig): boolean {
    // A field can be null if:
    // - Explicitly marked as nullable AND not marked as notNull
    if (fieldConfig.notNull) return false;
    if (fieldConfig.nullable === true) return true;

    // Fields with defaults are not nullable unless explicitly set
    if (fieldConfig.default !== undefined) return false;

    // Primary keys are not nullable
    if (fieldConfig.primaryKey) return false;

    return false; // Default to not nullable unless explicitly set
  }

  private toFieldConfig(field: any): FieldConfig | null {
    if (!field) return null;
    if (typeof field === 'object' && 'toConfig' in field) {
      return field.toConfig();
    }
    if (typeof field === 'object' && 'type' in field) {
      return field;
    }
    return null;
  }
}
