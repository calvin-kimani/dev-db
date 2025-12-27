import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { MockDataGenerator } from '../src/generator';
import { t } from '../src/schema-builder';
import type { Schema } from '../src/types';

describe('Mock Data Generator', () => {
  const testOutputDir = './test-output';

  afterAll(async () => {
    // Cleanup test output
    await Bun.$`rm -rf ${testOutputDir}`.quiet();
  });

  test('should generate data for simple schema', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
        email: t.varchar(255).unique(),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 42,
    });

    const data = await generator.generate();

    expect(data.User).toBeDefined();
    expect(data.User!.length).toBe(5);
    expect(data.User![0]?.id).toBe(1);
    expect(data.User![4]?.id).toBe(5);
  });

  test('should generate unique values', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        email: t.varchar(255).unique(),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 123,
    });

    const data = await generator.generate();
    const emails = data.User!.map(u => u.email);
    const uniqueEmails = new Set(emails);

    expect(uniqueEmails.size).toBe(10);
  });

  test('should handle foreign keys', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        user_id: t.foreignKey('User', 'id'),
        title: t.varchar(200),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 456,
    });

    const data = await generator.generate();

    expect(data.User!.length).toBe(5);
    expect(data.Post!.length).toBe(10);

    // All user_ids should reference valid user ids
    const userIds = data.User!.map(u => u.id);
    data.Post!.forEach(post => {
      expect(userIds.includes(post.user_id)).toBe(true);
    });
  });

  test('should use default values', async () => {
    const schema: Schema = {
      User: {
        $count: 3,
        id: t.bigserial().primaryKey(),
        is_active: t.boolean().default(true),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
    });

    const data = await generator.generate();

    data.User!.forEach(user => {
      expect(user.is_active).toBe(true);
    });
  });

  test('should respect enum values', async () => {
    const schema: Schema = {
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        status: t.varchar(20).enum(['draft', 'published', 'archived']),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 789,
    });

    const data = await generator.generate();

    data.Post!.forEach(post => {
      expect(['draft', 'published', 'archived'].includes(post.status)).toBe(true);
    });
  });

  test('should use custom generator', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        email: t.varchar(255).generate('internet.email'),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 101,
    });

    const data = await generator.generate();

    data.User!.forEach(user => {
      expect(user.email).toContain('@');
    });
  });

  test('should respect min/max constraints', async () => {
    const schema: Schema = {
      User: {
        $count: 20,
        id: t.bigserial().primaryKey(),
        age: t.integer().min(18).max(65),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 202,
    });

    const data = await generator.generate();

    data.User!.forEach(user => {
      expect(user.age).toBeGreaterThanOrEqual(18);
      expect(user.age).toBeLessThanOrEqual(65);
    });
  });

  test('should generate UUID primary keys', async () => {
    const schema: Schema = {
      User: {
        $count: 3,
        id: t.uuid().primaryKey(),
        name: t.varchar(50),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 303,
    });

    const data = await generator.generate();

    data.User!.forEach(user => {
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});
