import { test, expect, describe } from 'bun:test';
import { SchemaValidator } from '../src/validator';
import { t } from '../src/schema-builder';
import type { Schema } from '../src/types';

describe('Schema Validator', () => {
  test('should validate empty schema', () => {
    const validator = new SchemaValidator();
    const errors = validator.validate({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain('empty');
  });

  test('should validate missing primary key', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        name: t.varchar(50),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('primary key'))).toBe(true);
  });

  test('should pass validation for valid schema', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBe(0);
  });

  test('should detect foreign key to non-existent table', () => {
    const schema: Schema = {
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        user_id: t.foreignKey('User', 'id'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('non-existent table'))).toBe(true);
  });

  test('should detect foreign key to non-existent column', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        user_id: t.foreignKey('User', 'email'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('non-existent column'))).toBe(true);
  });

  test('should detect invalid min/max constraints', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        age: t.integer().min(100).max(50),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Min value'))).toBe(true);
  });

  test('should detect circular dependencies', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        profile_id: t.foreignKey('Profile', 'id'),
      },
      Profile: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        user_id: t.foreignKey('User', 'id'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Circular dependency'))).toBe(true);
  });

  test('should validate invalid $count', () => {
    const schema: Schema = {
      User: {
        $count: -5,
        id: t.bigserial().primaryKey(),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Invalid $count'))).toBe(true);
  });

  test('should detect empty enum', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        status: t.varchar(20).enum([]),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Enum'))).toBe(true);
  });

  test('should detect belongsTo to non-existent table', () => {
    const schema: Schema = {
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.integer(),
        author: t.belongsTo('User', 'userId'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('belongsTo references non-existent table'))).toBe(true);
  });

  test('should detect belongsTo with non-existent foreign key field', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        author: t.belongsTo('User', 'nonExistentField'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('belongsTo references non-existent foreign key field'))).toBe(true);
  });

  test('should detect hasMany to non-existent table', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        posts: t.hasMany('Post', 'userId', { min: 1, max: 5 }),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('hasMany references non-existent table'))).toBe(true);
  });

  test('should detect hasMany with non-existent foreign key field', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        posts: t.hasMany('Post', 'nonExistentField', { min: 1, max: 5 }),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        title: t.varchar(200),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('hasMany references non-existent foreign key field'))).toBe(true);
  });

  test('should detect invalid hasMany min/max constraints', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        posts: t.hasMany('Post', 'userId', { min: 10, max: 5 }),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.foreignKey('User', 'id'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('hasMany min'))).toBe(true);
  });

  test('should detect negative hasMany min value', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        posts: t.hasMany('Post', 'userId', { min: -1, max: 5 }),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.foreignKey('User', 'id'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('hasMany min') && e.message.includes('negative'))).toBe(true);
  });

  test('should pass validation for valid hasMany/belongsTo relationships', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
        posts: t.hasMany('Post', 'userId', { min: 1, max: 5 }),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.integer(),
        author: t.belongsTo('User', 'userId'),
        title: t.varchar(200),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBe(0);
  });

  test('should detect circular dependencies with belongsTo', () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        profileId: t.integer(),
        profile: t.belongsTo('Profile', 'profileId'),
      },
      Profile: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.integer(),
        user: t.belongsTo('User', 'userId'),
      },
    };

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('Circular dependency'))).toBe(true);
  });
});
