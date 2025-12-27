import { faker } from '@faker-js/faker';
import type { Schema, FieldConfig, TableConfig } from './types';

/**
 * Options for configuring the mock data generator.
 */
export interface GeneratorOptions {
  /** Directory where generated JSON files will be saved (default: './mock-data') */
  outputDir?: string;

  /** Random seed for reproducible data generation */
  seed?: number;
}

/**
 * Generated data indexed by table name.
 */
interface GeneratedData {
  [tableName: string]: any[];
}

/**
 * Generates realistic mock data from schema definitions.
 *
 * Features:
 * - Topological sorting to handle foreign key dependencies
 * - Unique value generation with retry logic
 * - Custom generators via Faker.js or custom functions
 * - Enum support
 * - Min/max constraints for numeric types
 * - Automatic foreign key resolution
 *
 * @example
 * ```typescript
 * const generator = new MockDataGenerator(schema, {
 *   outputDir: './mock-data',
 *   seed: 42 // Optional: for reproducible data
 * });
 *
 * const data = await generator.generate();
 * console.log(`Generated ${data.User.length} users`);
 * ```
 */
export class MockDataGenerator {
  private schema: Schema;
  private options: GeneratorOptions;
  private generatedData: GeneratedData = {};

  /**
   * Creates a new mock data generator.
   *
   * @param schema - The schema definition
   * @param options - Generator options
   */
  constructor(schema: Schema, options: GeneratorOptions = {}) {
    this.schema = schema;
    this.options = {
      outputDir: options.outputDir || './mock-data',
      seed: options.seed,
    };

    if (this.options.seed !== undefined) {
      faker.seed(this.options.seed);
    }
  }

  /**
   * Generates mock data for all tables in the schema.
   *
   * Tables are processed in dependency order (based on foreign keys).
   * Generated data is written to JSON files in the output directory.
   *
   * @returns Promise resolving to the generated data indexed by table name
   *
   * @example
   * ```typescript
   * const data = await generator.generate();
   * // Files created: ./mock-data/User.json, ./mock-data/Post.json, etc.
   * ```
   */
  async generate(): Promise<GeneratedData> {
    // Topologically sort tables based on foreign key dependencies
    const sortedTables = this.topologicalSort();

    // Generate data for each table in order
    for (const tableName of sortedTables) {
      const tableConfig = this.schema[tableName];
      if (!tableConfig) continue;

      const count = tableConfig.$count || 10;

      this.generatedData[tableName] = this.generateTableData(tableName, tableConfig, count);
    }

    // Write data to files
    await this.writeDataToFiles();

    return this.generatedData;
  }

  private topologicalSort(): string[] {
    const tables = Object.keys(this.schema);
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (tableName: string) => {
      if (visited.has(tableName)) return;
      visited.add(tableName);

      const tableConfig = this.schema[tableName];
      if (!tableConfig) return;

      const fields = Object.entries(tableConfig).filter(([key]) => key !== '$count');

      // Visit dependencies first
      for (const [_, field] of fields) {
        const fieldConfig = this.toFieldConfig(field);
        if (fieldConfig?.foreignKey) {
          const refTable = fieldConfig.foreignKey.table;
          if (refTable !== tableName) { // Avoid self-references
            visit(refTable);
          }
        }
      }

      result.push(tableName);
    };

    for (const tableName of tables) {
      visit(tableName);
    }

    return result;
  }

  private generateTableData(tableName: string, tableConfig: TableConfig, count: number): any[] {
    const records: any[] = [];
    const uniqueValues = new Map<string, Set<any>>();

    for (let i = 0; i < count; i++) {
      const record: any = {};
      const fields = Object.entries(tableConfig).filter(([key]) => key !== '$count');

      for (const [fieldName, field] of fields) {
        const fieldConfig = this.toFieldConfig(field);
        if (fieldConfig) {
          record[fieldName] = this.generateFieldValue(
            fieldName,
            fieldConfig,
            i,
            uniqueValues,
            tableName
          );
        }
      }

      records.push(record);
    }

    return records;
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

  private generateFieldValue(
    fieldName: string,
    fieldConfig: FieldConfig,
    index: number,
    uniqueValues: Map<string, Set<any>>,
    tableName: string
  ): any {
    // Handle default values
    if (fieldConfig.default !== undefined) {
      if (fieldConfig.default === 'now') {
        return new Date().toISOString();
      }
      return fieldConfig.default;
    }

    // Handle foreign keys
    if (fieldConfig.foreignKey) {
      const refTable = fieldConfig.foreignKey.table;
      const refColumn = fieldConfig.foreignKey.column;
      const refData = this.generatedData[refTable];

      if (!refData || refData.length === 0) {
        if (fieldConfig.nullable) return null;
        throw new Error(`Cannot generate foreign key for ${tableName}.${fieldName}: no data in ${refTable}`);
      }

      const randomRecord = refData[Math.floor(Math.random() * refData.length)];
      return randomRecord[refColumn];
    }

    // Handle serial/bigserial auto-increment
    if (fieldConfig.type === 'serial' || fieldConfig.type === 'bigserial') {
      return index + 1;
    }

    // Handle nullable fields (but not if they have enum, min/max constraints, or custom generators)
    if (
      fieldConfig.nullable &&
      !fieldConfig.notNull &&
      !fieldConfig.enum &&
      !fieldConfig.generator &&
      fieldConfig.min === undefined &&
      fieldConfig.max === undefined &&
      Math.random() < 0.1
    ) {
      return null;
    }

    // Generate value with uniqueness check
    let value: any;
    let attempts = 0;
    const maxAttempts = 1000;

    do {
      value = this.generateValueByType(fieldConfig);
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error(
          `Could not generate unique value for ${tableName}.${fieldName} after ${maxAttempts} attempts`
        );
      }
    } while (
      fieldConfig.unique &&
      uniqueValues.get(fieldName)?.has(JSON.stringify(value))
    );

    // Track unique values
    if (fieldConfig.unique) {
      if (!uniqueValues.has(fieldName)) {
        uniqueValues.set(fieldName, new Set());
      }
      uniqueValues.get(fieldName)!.add(JSON.stringify(value));
    }

    return value;
  }

  private generateValueByType(fieldConfig: FieldConfig): any {
    // Use custom generator if provided
    if (fieldConfig.generator) {
      if (typeof fieldConfig.generator === 'string') {
        return this.callFakerMethod(fieldConfig.generator);
      } else {
        return fieldConfig.generator(faker);
      }
    }

    // Use enum if provided
    if (fieldConfig.enum && fieldConfig.enum.length > 0) {
      return fieldConfig.enum[Math.floor(Math.random() * fieldConfig.enum.length)];
    }

    // Generate based on type
    switch (fieldConfig.type) {
      case 'uuid':
        return faker.string.uuid();

      case 'boolean':
        return faker.datatype.boolean();

      case 'integer':
      case 'bigint':
      case 'smallint':
        return faker.number.int({
          min: fieldConfig.min ?? 1,
          max: fieldConfig.max ?? 100000,
        });

      case 'decimal':
      case 'numeric':
      case 'real':
      case 'double':
        return faker.number.float({
          min: fieldConfig.min ?? 0,
          max: fieldConfig.max ?? 10000,
          fractionDigits: fieldConfig.scale ?? 2,
        });

      case 'varchar':
      case 'char':
        return faker.lorem.word().substring(0, fieldConfig.length || 255);

      case 'text':
        return faker.lorem.paragraph();

      case 'date':
        return faker.date.past().toISOString().split('T')[0];

      case 'time':
        return faker.date.recent().toISOString().split('T')[1]?.split('.')[0] ?? '00:00:00';

      case 'timestamp':
      case 'timestamptz':
        return faker.date.recent().toISOString();

      case 'json':
      case 'jsonb':
        return { data: faker.lorem.word() };

      default:
        return faker.lorem.word();
    }
  }

  private callFakerMethod(method: string): any {
    const parts = method.split('.');
    let current: any = faker;

    for (const part of parts) {
      current = current[part];
      if (current === undefined) {
        throw new Error(`Faker method not found: ${method}`);
      }
    }

    if (typeof current === 'function') {
      return current();
    }

    return current;
  }

  private async writeDataToFiles(): Promise<void> {
    const outputDir = this.options.outputDir ?? './mock-data';

    // Write each table to a JSON file (directory is created automatically)
    for (const [tableName, data] of Object.entries(this.generatedData)) {
      const filePath = `${outputDir}/${tableName}.json`;
      await Bun.write(filePath, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Gets the generated data without triggering generation.
   * Must be called after generate().
   *
   * @returns The generated data indexed by table name
   */
  getGeneratedData(): GeneratedData {
    return this.generatedData;
  }
}
