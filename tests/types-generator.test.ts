import { test, expect, describe, afterAll } from 'bun:test';
import { TypesGenerator } from '../src/types-generator';
import { t } from '../src/schema-builder';
import type { Schema } from '../src/types';

describe('TypeScript Types Generator', () => {
  const testOutputDir = './test-types-output';

  afterAll(async () => {
    // Cleanup test output
    await Bun.$`rm -rf ${testOutputDir}`.quiet();
  });

  test('should generate basic interface', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        email: t.varchar(255).notNull(),
        age: t.integer(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('export interface User');
    expect(content).toContain('id: number');
    expect(content).toContain('email: string');
    expect(content).toContain('age: number');
  });

  test('should handle nullable fields', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        bio: t.text().nullable(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('bio: string | null');
  });

  test('should handle optional fields with defaults', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        created_at: t.timestamptz().default('now'),
        is_active: t.boolean().default(true),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('created_at?: string');
    expect(content).toContain('is_active?: boolean');
  });

  test('should resolve foreign key types', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(100),
      },
      Post: {
        $count: 50,
        id: t.uuid().primaryKey(),
        user_id: t.foreignKey('User', 'id').notNull(),
        title: t.varchar(200),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    // user_id should be number (referencing User.id which is bigserial)
    expect(content).toContain('user_id: number');
    // Post.id should be string (uuid)
    expect(content).toContain('export interface Post');
    expect(content).toContain('id: string');
  });

  test('should map all numeric types to number', async () => {
    const schema: Schema = {
      Numbers: {
        $count: 5,
        bigint_col: t.bigint(),
        bigserial_col: t.bigserial().primaryKey(),
        integer_col: t.integer(),
        smallint_col: t.smallint(),
        serial_col: t.serial(),
        decimal_col: t.decimal(10, 2),
        numeric_col: t.numeric(10, 2),
        real_col: t.real(),
        double_col: t.double(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('bigint_col: number');
    expect(content).toContain('bigserial_col: number');
    expect(content).toContain('integer_col: number');
    expect(content).toContain('smallint_col: number');
    expect(content).toContain('serial_col: number');
    expect(content).toContain('decimal_col: number');
    expect(content).toContain('numeric_col: number');
    expect(content).toContain('real_col: number');
    expect(content).toContain('double_col: number');
  });

  test('should map string types correctly', async () => {
    const schema: Schema = {
      Strings: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        varchar_col: t.varchar(255),
        char_col: t.char(10),
        text_col: t.text(),
        uuid_col: t.uuid(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('varchar_col: string');
    expect(content).toContain('char_col: string');
    expect(content).toContain('text_col: string');
    expect(content).toContain('uuid_col: string');
  });

  test('should map date/time types to string', async () => {
    const schema: Schema = {
      Dates: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        date_col: t.date(),
        time_col: t.time(),
        timestamp_col: t.timestamp(),
        timestamptz_col: t.timestamptz(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('date_col: string');
    expect(content).toContain('time_col: string');
    expect(content).toContain('timestamp_col: string');
    expect(content).toContain('timestamptz_col: string');
  });

  test('should handle boolean type', async () => {
    const schema: Schema = {
      User: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        is_active: t.boolean(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('is_active: boolean');
  });

  test('should handle json types', async () => {
    const schema: Schema = {
      Config: {
        $count: 5,
        id: t.bigserial().primaryKey(),
        settings: t.json(),
        metadata: t.jsonb(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('settings: any');
    expect(content).toContain('metadata: any');
  });

  test('should generate multiple interfaces', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
        name: t.varchar(100),
      },
      Post: {
        $count: 50,
        id: t.bigserial().primaryKey(),
        title: t.varchar(200),
      },
      Comment: {
        $count: 200,
        id: t.uuid().primaryKey(),
        content: t.text(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    expect(content).toContain('export interface User');
    expect(content).toContain('export interface Post');
    expect(content).toContain('export interface Comment');
  });

  test('should use custom filename', async () => {
    const schema: Schema = {
      User: {
        $count: 10,
        id: t.bigserial().primaryKey(),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
      fileName: 'custom-types.ts',
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/custom-types.ts`);
    const exists = await typesFile.exists();

    expect(exists).toBe(true);
  });

  test('should handle complex schema with relationships', async () => {
    const schema: Schema = {
      Author: {
        $count: 10,
        id: t.uuid().primaryKey(),
        email: t.varchar(255).unique().notNull(),
        bio: t.text().nullable(),
      },
      Article: {
        $count: 50,
        id: t.bigserial().primaryKey(),
        author_id: t.foreignKey('Author', 'id').notNull(),
        title: t.varchar(200).notNull(),
        published_at: t.timestamptz().nullable(),
        view_count: t.integer().default(0),
      },
    };

    const generator = new TypesGenerator(schema, {
      outputDir: testOutputDir,
    });

    await generator.generate();

    const typesFile = Bun.file(`${testOutputDir}/types.ts`);
    const content = await typesFile.text();

    // Author
    expect(content).toContain('export interface Author');
    expect(content).toContain('id: string'); // uuid
    expect(content).toContain('email: string');
    expect(content).toContain('bio: string | null');

    // Article
    expect(content).toContain('export interface Article');
    expect(content).toContain('id: number');
    expect(content).toContain('author_id: string'); // references Author.id (uuid)
    expect(content).toContain('title: string');
    expect(content).toContain('published_at: string | null');
    expect(content).toContain('view_count?: number'); // has default
  });
});
