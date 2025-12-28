import { test, expect, describe, afterAll } from 'bun:test';
import { MockDataGenerator } from '../src/generator';
import { TypesGenerator } from '../src/types-generator';
import { t } from '../src/schema-builder';
import type { Schema } from '../src/types';

describe('JSON Schema Support', () => {
  const testOutputDir = './test-json-schema-output';

  afterAll(async () => {
    // Cleanup test output
    await Bun.$`rm -rf ${testOutputDir}`.quiet();
  });

  test('should generate data for simple JSON schema', async () => {
    const schema: Schema = {
      Config: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        settings: t.json({
          theme: t.varchar(20),
          language: t.varchar(10),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 42,
    });

    const data = await generator.generate();

    expect(data.Config).toBeDefined();
    expect(data.Config!.length).toBe(5);

    // Check that settings is an object with the right structure
    data.Config!.forEach(config => {
      expect(config.settings).toBeDefined();
      expect(typeof config.settings).toBe('object');
      expect(typeof config.settings.theme).toBe('string');
      expect(typeof config.settings.language).toBe('string');
    });
  });

  test('should generate data for nested JSON schema', async () => {
    const schema: Schema = {
      User: {
        $count: 3,
        id: t.bigserial().primaryKey(),
        profile: t.json({
          name: t.varchar(100),
          age: t.integer().min(18).max(90),
          preferences: t.json({
            notifications: t.boolean(),
            theme: t.varchar(20).enum(['light', 'dark']),
          }),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 123,
    });

    const data = await generator.generate();

    expect(data.User!.length).toBe(3);

    data.User!.forEach(user => {
      // Check top-level JSON
      expect(user.profile).toBeDefined();
      expect(typeof user.profile.name).toBe('string');
      expect(typeof user.profile.age).toBe('number');
      expect(user.profile.age).toBeGreaterThanOrEqual(18);
      expect(user.profile.age).toBeLessThanOrEqual(90);

      // Check nested JSON
      expect(user.profile.preferences).toBeDefined();
      expect(typeof user.profile.preferences.notifications).toBe('boolean');
      expect(['light', 'dark'].includes(user.profile.preferences.theme)).toBe(true);
    });
  });

  test('should generate types for simple JSON schema', async () => {
    const schema: Schema = {
      Config: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        settings: t.json({
          theme: t.varchar(20),
          language: t.varchar(10),
        }),
      },
    };

    const typesGenerator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await typesGenerator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('export interface Config');
    expect(content).toContain('id: number');
    expect(content).toContain('theme: string');
    expect(content).toContain('language: string');
  });

  test('should generate types for nested JSON schema', async () => {
    const schema: Schema = {
      User: {
        $count: 3,
        id: t.bigserial().primaryKey(),
        profile: t.json({
          name: t.varchar(100),
          age: t.integer(),
          preferences: t.json({
            notifications: t.boolean(),
            theme: t.varchar(20),
          }),
        }),
      },
    };

    const typesGenerator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await typesGenerator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('export interface User');
    expect(content).toContain('id: number');
    expect(content).toContain('profile: {');
    expect(content).toContain('name: string');
    expect(content).toContain('age: number');
    expect(content).toContain('preferences: {');
    expect(content).toContain('notifications: boolean');
    expect(content).toContain('theme: string');
  });

  test('should handle nullable fields in JSON schema', async () => {
    const schema: Schema = {
      Config: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        metadata: t.json({
          version: t.integer(),
          description: t.text().nullable(),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 456,
    });

    const data = await generator.generate();

    data.Config!.forEach(config => {
      expect(config.metadata).toBeDefined();
      expect(typeof config.metadata.version).toBe('number');
      // description can be string or null
      expect(config.metadata.description === null || typeof config.metadata.description === 'string').toBe(true);
    });
  });

  test('should handle optional fields in JSON schema types', async () => {
    const schema: Schema = {
      Config: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        settings: t.json({
          apiKey: t.varchar(100),
          timeout: t.integer().default(3000),
        }),
      },
    };

    const typesGenerator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await typesGenerator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('apiKey: string');
    expect(content).toContain('timeout?: number'); // Optional because it has a default
  });

  test('should use custom generators in JSON schema', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        contact: t.json({
          email: t.varchar(255).generate('internet.email'),
          phone: t.varchar(20).generate('phone.number'),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 789,
    });

    const data = await generator.generate();

    data.User!.forEach(user => {
      expect(user.contact).toBeDefined();
      expect(user.contact.email).toContain('@');
      expect(typeof user.contact.phone).toBe('string');
    });
  });

  test('should work with JSONB type', async () => {
    const schema: Schema = {
      Document: {
        $count: 3,
        id: t.uuid().primaryKey(),
        data: t.jsonb({
          title: t.varchar(200),
          tags: t.varchar(100),
          published: t.boolean(),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 999,
    });

    const data = await generator.generate();

    expect(data.Document!.length).toBe(3);

    data.Document!.forEach(doc => {
      expect(doc.data).toBeDefined();
      expect(typeof doc.data.title).toBe('string');
      expect(typeof doc.data.tags).toBe('string');
      expect(typeof doc.data.published).toBe('boolean');
    });
  });

  test('should handle JSON schema with enum values', async () => {
    const schema: Schema = {
      Config: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        settings: t.json({
          mode: t.varchar(20).enum(['development', 'staging', 'production']),
          logLevel: t.varchar(20).enum(['debug', 'info', 'warn', 'error']),
        }),
      },
    };

    const generator = new MockDataGenerator(schema, {
      outputDir: testOutputDir,
      seed: 111,
    });

    const data = await generator.generate();

    data.Config!.forEach(config => {
      expect(['development', 'staging', 'production'].includes(config.settings.mode)).toBe(true);
      expect(['debug', 'info', 'warn', 'error'].includes(config.settings.logLevel)).toBe(true);
    });
  });
});
