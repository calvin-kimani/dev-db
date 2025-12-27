import { test, expect, describe } from 'bun:test';
import { t } from '../src/schema-builder';

describe('Schema Builder API', () => {
  test('should create varchar field', () => {
    const field = t.varchar(255);
    const config = field.toConfig();
    expect(config.type).toBe('varchar');
    expect(config.length).toBe(255);
  });

  test('should create integer field with constraints', () => {
    const field = t.integer().min(18).max(100).notNull();
    const config = field.toConfig();
    expect(config.type).toBe('integer');
    expect(config.min).toBe(18);
    expect(config.max).toBe(100);
    expect(config.notNull).toBe(true);
  });

  test('should create primary key field', () => {
    const field = t.bigserial().primaryKey();
    const config = field.toConfig();
    expect(config.type).toBe('bigserial');
    expect(config.primaryKey).toBe(true);
    expect(config.notNull).toBe(true);
  });

  test('should create unique field', () => {
    const field = t.varchar(50).unique();
    const config = field.toConfig();
    expect(config.unique).toBe(true);
  });

  test('should create field with default value', () => {
    const field = t.boolean().default(true);
    const config = field.toConfig();
    expect(config.default).toBe(true);
  });

  test('should create field with enum', () => {
    const field = t.varchar(20).enum(['draft', 'published', 'archived']);
    const config = field.toConfig();
    expect(config.enum).toEqual(['draft', 'published', 'archived']);
  });

  test('should create foreign key field', () => {
    const field = t.foreignKey('User', 'id');
    const config = field.toConfig();
    expect(config.type).toBe('foreignKey');
    expect(config.foreignKey).toEqual({ table: 'User', column: 'id' });
  });

  test('should create field with custom generator', () => {
    const field = t.varchar(100).generate('internet.email');
    const config = field.toConfig();
    expect(config.generator).toBe('internet.email');
  });

  test('should support method chaining', () => {
    const field = t.varchar(255).unique().notNull().generate('internet.email');
    const config = field.toConfig();
    expect(config.type).toBe('varchar');
    expect(config.length).toBe(255);
    expect(config.unique).toBe(true);
    expect(config.notNull).toBe(true);
    expect(config.generator).toBe('internet.email');
  });

  test('should create uuid field', () => {
    const field = t.uuid().primaryKey();
    const config = field.toConfig();
    expect(config.type).toBe('uuid');
    expect(config.primaryKey).toBe(true);
  });

  test('should create timestamp field', () => {
    const field = t.timestamptz().default('now');
    const config = field.toConfig();
    expect(config.type).toBe('timestamptz');
    expect(config.default).toBe('now');
  });
});
