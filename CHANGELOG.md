# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-28

### Added

- **TypeScript Types Generation**: Auto-generate TypeScript type definitions from schemas
  - New `TypesGenerator` class for programmatic usage
  - CLI `--types` (`-t`) flag to generate types alongside JSON data
  - Proper type mapping for all field types (string, number, boolean, etc.)
  - Foreign key type resolution (looks up referenced column type)
  - Nullable and optional field handling
  - Generates `types.ts` file with interface definitions for all tables

- **Structured JSON Schema Support**: Define type-safe JSON/JSONB fields with nested schemas
  - Support for `t.json({ ... })` and `t.jsonb({ ... })` with nested field definitions
  - Unlimited nesting depth for complex data structures
  - TypesGenerator creates proper nested types instead of `any`
  - MockDataGenerator generates structured data matching the schema
  - All field modifiers work in JSON schemas (`.nullable()`, `.default()`, `.enum()`, `.generate()`)
  - Prevents nullable value generation for fields with JSON schemas

### Changed

- Updated README with comprehensive documentation for both features
- Enhanced field builder with `withJsonSchema()` method for internal use

## [0.2.1] - 2025-12-25

### Fixed

- Support for relative paths in CLI

## [0.2.0] - 2025-12-25

### Added

- CLI executable with directory support for schema files
- Project files and initial setup

## [0.1.0] - 2025-12-25

### Added

- Initial release with core mock data generation functionality
- Type-safe schema definition using fluent API
- Faker.js integration for realistic data
- Foreign key support with topological sorting
- Schema validation
- Basic CLI

[0.3.0]: https://github.com/calvin-kimani/dev-db/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/calvin-kimani/dev-db/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/calvin-kimani/dev-db/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/calvin-kimani/dev-db/releases/tag/v0.1.0
