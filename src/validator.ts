import type { Schema, FieldConfig, TableConfig } from './types';

/**
 * Represents a validation error found in a schema.
 */
export interface ValidationError {
  /** The table where the error occurred */
  table: string;

  /** The field where the error occurred (if applicable) */
  field?: string;

  /** Human-readable error message */
  message: string;
}

/**
 * Validates database schemas for common errors and inconsistencies.
 *
 * Checks for:
 * - Missing primary keys
 * - Invalid foreign key references
 * - Circular dependencies
 * - Invalid constraints (e.g., min > max)
 * - Empty enums
 * - Invalid $count values
 *
 * @example
 * ```typescript
 * const validator = new SchemaValidator();
 * const errors = validator.validate(schema);
 *
 * if (errors.length > 0) {
 *   console.error('Schema validation failed:');
 *   errors.forEach(err => {
 *     console.error(`  ${err.table}.${err.field}: ${err.message}`);
 *   });
 * }
 * ```
 */
export class SchemaValidator {
  private errors: ValidationError[] = [];

  /**
   * Validates a complete schema and returns any errors found.
   *
   * @param schema - The schema to validate
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = validator.validate(schema);
   * if (errors.length === 0) {
   *   console.log('Schema is valid!');
   * }
   * ```
   */
  validate(schema: Schema): ValidationError[] {
    this.errors = [];

    // Check for empty schema
    if (Object.keys(schema).length === 0) {
      this.errors.push({
        table: '',
        message: 'Schema is empty',
      });
      return this.errors;
    }

    // Validate each table
    for (const [tableName, tableConfig] of Object.entries(schema)) {
      this.validateTable(tableName, tableConfig, schema);
    }

    // Check for circular dependencies
    this.checkCircularDependencies(schema);

    return this.errors;
  }

  private validateTable(tableName: string, tableConfig: TableConfig, schema: Schema): void {
    // Check if $count is valid
    if (tableConfig.$count !== undefined && (tableConfig.$count < 0 || !Number.isInteger(tableConfig.$count))) {
      this.errors.push({
        table: tableName,
        message: `Invalid $count: ${tableConfig.$count}. Must be a non-negative integer.`,
      });
    }

    const fields = Object.entries(tableConfig).filter(([key]) => key !== '$count');

    if (fields.length === 0) {
      this.errors.push({
        table: tableName,
        message: 'Table has no fields defined',
      });
      return;
    }

    // Check if there's at least one primary key
    const hasPrimaryKey = fields.some(([_, config]) => {
      const fieldConfig = this.toFieldConfig(config);
      return fieldConfig?.primaryKey;
    });

    if (!hasPrimaryKey) {
      this.errors.push({
        table: tableName,
        message: 'Table must have at least one primary key',
      });
    }

    // Validate each field
    for (const [fieldName, fieldConfig] of fields) {
      const config = this.toFieldConfig(fieldConfig);
      if (config) {
        this.validateField(tableName, fieldName, config, schema);
      }
    }
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

  private validateField(tableName: string, fieldName: string, fieldConfig: FieldConfig, schema: Schema): void {
    // Validate foreign key references
    if (fieldConfig.foreignKey) {
      const { table: refTable, column: refColumn } = fieldConfig.foreignKey;

      if (!schema[refTable]) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `Foreign key references non-existent table '${refTable}'`,
        });
      } else {
        const refTableConfig = schema[refTable];
        const refFields = Object.entries(refTableConfig).filter(([key]) => key !== '$count');
        const refFieldExists = refFields.some(([name]) => name === refColumn);

        if (!refFieldExists) {
          this.errors.push({
            table: tableName,
            field: fieldName,
            message: `Foreign key references non-existent column '${refColumn}' in table '${refTable}'`,
          });
        }
      }
    }

    // Validate belongsTo relationships
    if (fieldConfig.belongsTo) {
      const { table: refTable, foreignKey: refForeignKey } = fieldConfig.belongsTo;

      if (!schema[refTable]) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `belongsTo references non-existent table '${refTable}'`,
        });
      }

      // Check if the foreign key field exists in the current table
      const currentTableFields = Object.keys(schema[tableName]).filter(key => key !== '$count');
      if (!currentTableFields.includes(refForeignKey)) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `belongsTo references non-existent foreign key field '${refForeignKey}' in current table`,
        });
      }
    }

    // Validate hasMany relationships
    if (fieldConfig.hasMany) {
      const { table: relatedTable, foreignKey: foreignKeyField, min, max } = fieldConfig.hasMany;

      if (!schema[relatedTable]) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `hasMany references non-existent table '${relatedTable}'`,
        });
      } else {
        // Check if the foreign key field exists in the related table
        const relatedTableFields = Object.keys(schema[relatedTable]).filter(key => key !== '$count');
        if (!relatedTableFields.includes(foreignKeyField)) {
          this.errors.push({
            table: tableName,
            field: fieldName,
            message: `hasMany references non-existent foreign key field '${foreignKeyField}' in table '${relatedTable}'`,
          });
        }
      }

      // Validate min/max constraints for hasMany
      if (min !== undefined && max !== undefined && min > max) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `hasMany min (${min}) cannot be greater than max (${max})`,
        });
      }

      if (min !== undefined && min < 0) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `hasMany min (${min}) cannot be negative`,
        });
      }
    }

    // Validate min/max constraints
    if (fieldConfig.min !== undefined && fieldConfig.max !== undefined) {
      if (fieldConfig.min > fieldConfig.max) {
        this.errors.push({
          table: tableName,
          field: fieldName,
          message: `Min value (${fieldConfig.min}) cannot be greater than max value (${fieldConfig.max})`,
        });
      }
    }

    // Validate enum
    if (fieldConfig.enum && fieldConfig.enum.length === 0) {
      this.errors.push({
        table: tableName,
        field: fieldName,
        message: 'Enum must have at least one value',
      });
    }

    // Validate conflicting constraints
    if (fieldConfig.notNull && fieldConfig.nullable) {
      this.errors.push({
        table: tableName,
        field: fieldName,
        message: 'Field cannot be both notNull and nullable',
      });
    }
  }

  private checkCircularDependencies(schema: Schema): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (tableName: string, path: string[]): boolean => {
      visited.add(tableName);
      recursionStack.add(tableName);

      const tableConfig = schema[tableName];
      if (!tableConfig) return false;

      const fields = Object.entries(tableConfig).filter(([key]) => key !== '$count');

      for (const [_, fieldConfig] of fields) {
        const config = this.toFieldConfig(fieldConfig);

        // Check foreignKey dependencies
        if (config?.foreignKey) {
          const refTable = config.foreignKey.table;

          if (!visited.has(refTable)) {
            if (hasCycle(refTable, [...path, refTable])) {
              return true;
            }
          } else if (recursionStack.has(refTable)) {
            this.errors.push({
              table: tableName,
              message: `Circular dependency detected: ${[...path, refTable].join(' -> ')}`,
            });
            return true;
          }
        }

        // Check belongsTo dependencies
        if (config?.belongsTo) {
          const refTable = config.belongsTo.table;

          if (!visited.has(refTable)) {
            if (hasCycle(refTable, [...path, refTable])) {
              return true;
            }
          } else if (recursionStack.has(refTable)) {
            this.errors.push({
              table: tableName,
              message: `Circular dependency detected: ${[...path, refTable].join(' -> ')}`,
            });
            return true;
          }
        }
      }

      recursionStack.delete(tableName);
      return false;
    };

    for (const tableName of Object.keys(schema)) {
      if (!visited.has(tableName)) {
        hasCycle(tableName, [tableName]);
      }
    }
  }
}
