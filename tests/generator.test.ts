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

  test('should handle belongsTo relationships', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.integer(),
        author: t.belongsTo('User', 'userId'),
        title: t.varchar(200),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 404,
    });

    const data = await generator.generate();

    expect(data.User!.length).toBe(5);
    expect(data.Post!.length).toBe(10);

    // All posts should have userId in generated data (but not 'author' field)
    data.Post!.forEach(post => {
      expect(post.userId).toBeDefined();
      expect(post.author).toBeUndefined(); // belongsTo is for generation logic, not output
    });
  });

  test('should calculate record counts based on hasMany relationships', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
        posts: t.hasMany('Post', 'userId', { min: 2, max: 4 }),
      },
      Post: {
        $count: 100, // This should be overridden by hasMany calculation
        id: t.bigserial().primaryKey(),
        userId: t.foreignKey('User', 'id'),
        title: t.varchar(200),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 505,
    });

    const data = await generator.generate();

    expect(data.User!.length).toBe(10);

    // With min=2 and max=4, average is 3 posts per user
    // 10 users * 3 posts = 30 posts (approximately)
    expect(data.Post!.length).toBe(30);

    // All user_ids should reference valid user ids
    const userIds = data.User!.map(u => u.id);
    data.Post!.forEach(post => {
      expect(userIds.includes(post.userId)).toBe(true);
    });
  });

  test('should not include hasMany virtual fields in output', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        name: t.varchar(50),
        posts: t.hasMany('Post', 'userId', { min: 1, max: 3 }),
      },
      Post: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        userId: t.foreignKey('User', 'id'),
        title: t.varchar(200),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 606,
    });

    const data = await generator.generate();

    // hasMany 'posts' field should not appear in generated User records
    data.User!.forEach(user => {
      expect(user.posts).toBeUndefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
    });
  });

  test('should handle complex hasMany/belongsTo relationships', async () => {
    const schema: Schema = {
      Author: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        name: t.varchar(100),
        articles: t.hasMany('Article', 'authorId', { min: 2, max: 6 }),
      },
      Article: {
        $count: 50, // Will be overridden
        id: t.bigserial().primaryKey(),
        authorId: t.integer(),
        author: t.belongsTo('Author', 'authorId'),
        title: t.varchar(200),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 707,
    });

    const data = await generator.generate();

    expect(data.Author!.length).toBe(5);

    // With min=2, max=6, average is 4 articles per author
    // 5 authors * 4 articles = 20 articles
    expect(data.Article!.length).toBe(20);

    // All articles should have authorId
    const authorIds = data.Author!.map(a => a.id);
    data.Article!.forEach(article => {
      expect(authorIds.includes(article.authorId)).toBe(true);
      expect(article.author).toBeUndefined(); // Virtual field
    });
  });
});
