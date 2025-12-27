#!/usr/bin/env bun

/**
 * CLI for @doviui/dev-db - Generate mock JSON databases from TypeScript schemas
 */

import { MockDataGenerator } from './src/generator';
import { SchemaValidator } from './src/validator';
import type { Schema } from './src/types';
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const HELP_TEXT = `
@doviui/dev-db - Generate realistic mock JSON databases

USAGE:
  dev-db <path> [options]

ARGUMENTS:
  <path>               Path to schema file or directory containing schema files

OPTIONS:
  -o, --output <dir>     Output directory for generated JSON files (default: ./mock-data)
  -s, --seed <number>    Random seed for reproducible data generation
  -h, --help             Show this help message

EXAMPLES:
  dev-db schema.ts
  dev-db ./schemas
  dev-db schema.ts -o ./data -s 42
  dev-db ./schemas --output ./database --seed 12345

SCHEMA FILE FORMAT:
  Schema files must export a default object or named 'schema' export:

  import { t } from '@doviui/dev-db';

  export default {
    User: {
      $count: 100,
      id: t.bigserial().primaryKey(),
      email: t.varchar(255).unique().notNull().generate('internet.email'),
      name: t.varchar(100).notNull()
    }
  };

DIRECTORY SUPPORT:
  When a directory is provided, all .ts and .js files are loaded and their
  schemas are merged. This allows you to organize schemas across multiple files.
`;

interface CLIOptions {
  schemaPath?: string;
  outputDir: string;
  seed?: number;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    outputDir: './mock-data',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-o' || arg === '--output') {
      const nextArg = args[++i];
      if (nextArg) options.outputDir = nextArg;
    } else if (arg === '-s' || arg === '--seed') {
      const nextArg = args[++i];
      if (nextArg !== undefined) options.seed = parseInt(nextArg, 10);
    } else if (!arg.startsWith('-')) {
      options.schemaPath = arg;
    }
  }

  return options;
}

async function loadSchemaFromFile(filePath: string): Promise<Schema> {
  try {
    // Resolve path relative to current working directory
    const resolvedPath = filePath.startsWith('.') || filePath.startsWith('/')
      ? filePath
      : `./${filePath}`;

    const module = await import(resolvedPath);
    const schema = module.default || module.schema;

    if (!schema) {
      throw new Error(
        'Schema file must export a default object or named "schema" export'
      );
    }

    return schema;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load schema file: ${error.message}`);
    }
    throw error;
  }
}

async function loadSchemaFromDirectory(dirPath: string): Promise<Schema> {
  try {
    const resolvedDir = dirPath.startsWith('.') || dirPath.startsWith('/')
      ? dirPath
      : `./${dirPath}`;

    const files = readdirSync(resolvedDir);
    const schemaFiles = files.filter(file => {
      const ext = extname(file);
      return ext === '.ts' || ext === '.js';
    });

    if (schemaFiles.length === 0) {
      throw new Error(`No schema files (.ts or .js) found in directory: ${dirPath}`);
    }

    const mergedSchema: Schema = {};

    for (const file of schemaFiles) {
      const filePath = join(resolvedDir, file);
      const schema = await loadSchemaFromFile(filePath);

      // Merge schemas
      Object.assign(mergedSchema, schema);
    }

    return mergedSchema;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load schemas from directory: ${error.message}`);
    }
    throw error;
  }
}

async function loadSchema(path: string): Promise<Schema> {
  const resolvedPath = path.startsWith('.') || path.startsWith('/')
    ? path
    : `./${path}`;

  const stats = statSync(resolvedPath);

  if (stats.isDirectory()) {
    return loadSchemaFromDirectory(path);
  } else if (stats.isFile()) {
    return loadSchemaFromFile(path);
  } else {
    throw new Error(`Path is neither a file nor a directory: ${path}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || !options.schemaPath) {
    console.log(HELP_TEXT);
    process.exit(options.help ? 0 : 1);
  }

  try {
    const schema = await loadSchema(options.schemaPath);

    const validator = new SchemaValidator();
    const errors = validator.validate(schema);

    if (errors.length > 0) {
      console.error('Schema validation failed:\n');
      errors.forEach((error) => {
        const location = error.field ? `${error.table}.${error.field}` : error.table;
        console.error(`  ${location}: ${error.message}`);
      });
      process.exit(1);
    }

    const generator = new MockDataGenerator(schema, {
      outputDir: options.outputDir,
      seed: options.seed,
    });

    await generator.generate();

    console.log(`Generated mock data in: ${options.outputDir}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
