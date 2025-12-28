# dev-db

**TypeScript-first mock database generator for rapid application development**

dev-db eliminates the friction of setting up databases during development. Define your data model with a type-safe schema, generate realistic mock data instantly, and iterate faster without database infrastructure overhead.

## Why dev-db?

**For Frontend Developers**: Build and test UI components with realistic data without waiting for backend APIs. Generate hundreds of records in seconds and work independently.

**For Backend Developers**: Prototype schemas, test business logic, and validate data models before committing to a database. Catch schema errors early with built-in validation.

**For Teams**: Share reproducible datasets across development, testing, and CI/CD environments using seeds. Onboard new developers instantly with pre-generated data.

## Key Features

- **Type-Safe Schema Definition** - Fluent TypeScript API with full IntelliSense support
- **TypeScript Types Generation** - Auto-generate type definitions from schemas for type-safe data consumption
- **Automatic Relationship Resolution** - Foreign keys handled intelligently with topological sorting
- **Production-Quality Mock Data** - Powered by Faker.js for realistic, diverse datasets
- **Built-In Validation** - Detect circular dependencies, missing tables, and constraint conflicts before generation
- **Reproducible Datasets** - Seed-based generation for consistent data across environments
- **Zero Configuration** - Works out of the box, no database setup required

## Installation

```bash
bun add @doviui/dev-db
# or
npm install @doviui/dev-db
# or
yarn add @doviui/dev-db
# or
pnpm add @doviui/dev-db
```

## Quick Start

### Step 1: Define Your Schema

Create schema files using the fluent TypeScript API:

```typescript
// schemas/user.schema.ts
import { t } from '@doviui/dev-db'

export default {
  User: {
    $count: 100, // Generate 100 users
    
    id: t.bigserial().primaryKey(),
    username: t.varchar(50).unique().notNull().generate('internet.userName'),
    email: t.varchar(255).unique().notNull().generate('internet.email'),
    full_name: t.text().generate('person.fullName'),
    age: t.integer().min(18).max(90),
    is_active: t.boolean().default(true),
    created_at: t.timestamptz().default('now')
  }
}
```

```typescript
// schemas/post.schema.ts
import { t } from '@doviui/dev-db'

export default {
  Post: {
    $count: 500, // Generate 500 posts
    
    id: t.bigserial().primaryKey(),
    user_id: t.foreignKey('User', 'id').notNull(),
    title: t.varchar(200).generate('lorem.sentence'),
    content: t.text().generate('lorem.paragraphs'),
    status: t.varchar(20).enum(['draft', 'published', 'archived']).default('draft'),
    view_count: t.integer().default(0),
    created_at: t.timestamptz().default('now')
  }
}
```

### Step 2: Generate Your Data

#### Using the CLI directly

Run the CLI to generate JSON files from a single schema file or a directory:

```bash
# Generate from a single schema file
bunx @doviui/dev-db schema.ts

# Generate from a directory of schema files
bunx @doviui/dev-db ./schemas

# Specify output directory
bunx @doviui/dev-db schema.ts -o ./data

# Use a seed for reproducible data
bunx @doviui/dev-db ./schemas --seed 42

# Combine options
bunx @doviui/dev-db ./schemas -o ./mock-data -s 42
```

**Directory Support:** When a directory is provided, all `.ts` and `.js` files are loaded and their schemas are merged. This allows you to organize related tables across multiple files for better maintainability.

#### Adding to package.json scripts

Add generation to your project's scripts:

```json
{
  "scripts": {
    "generate:data": "bunx @doviui/dev-db ./schemas -o ./mock-data",
    "generate:data:seed": "bunx @doviui/dev-db ./schemas -o ./mock-data -s 42"
  }
}
```

Then run with:

```bash
bun run generate:data
# or with a seed
bun run generate:data:seed
```

### Step 3: Consume Your Data

Import the generated JSON and use it in your application:

```typescript
// server.ts
import users from './mock-data/User.json'
import posts from './mock-data/Post.json'

// Simple query helpers
function getUserById(id: number) {
  return users.find(u => u.id === id)
}

function getPostsByUserId(userId: number) {
  return posts.filter(p => p.user_id === userId)
}

// Use in your API
app.get('/users/:id', (req, res) => {
  const user = getUserById(parseInt(req.params.id))
  if (!user) return res.status(404).json({ error: 'User not found' })

  const userPosts = getPostsByUserId(user.id)
  res.json({ ...user, posts: userPosts })
})
```

### Type-Safe Data Consumption

Generate TypeScript type definitions from your schemas for full type safety when consuming the mock data:

```bash
# Generate types alongside JSON data
bunx @doviui/dev-db schema.ts --types
```

This creates a `types.ts` file with interfaces matching your schema:

```typescript
// mock-data/types.ts (auto-generated)
export interface User {
  id: number;
  username: string;
  email: string;
  age: number | null;
  created_at?: string;
}

export interface Post {
  id: number;
  user_id: number;  // Correctly typed based on User.id
  title: string;
  content: string | null;
  created_at?: string;
}
```

Import and use the types in your application:

```typescript
// server.ts
import users from './mock-data/User.json'
import posts from './mock-data/Post.json'
import type { User, Post } from './mock-data/types'

// Fully type-safe!
function getUserById(id: number): User | undefined {
  return users.find(u => u.id === id)
}

function getPostsByUserId(userId: number): Post[] {
  return posts.filter(p => p.user_id === userId)
}
```

**Programmatic API:**

```typescript
import { TypesGenerator } from '@doviui/dev-db'

const typesGenerator = new TypesGenerator(schema, {
  outputDir: './mock-data',
  fileName: 'types.ts'  // Optional, defaults to 'types.ts'
})

await typesGenerator.generate()
```

## API Reference

### Data Types

dev-db supports a comprehensive set of SQL-inspired data types:

#### Numeric Types
```typescript
t.bigint()       // Big integer
t.bigserial()    // Auto-incrementing big integer
t.integer()      // Standard integer
t.smallint()     // Small integer
t.serial()       // Auto-incrementing integer
t.decimal(10, 2) // Decimal with precision and scale
t.numeric(10, 2) // Alias for decimal
t.real()         // Floating point
t.double()       // Double precision float
```

#### String Types
```typescript
t.varchar(255)   // Variable-length string
t.char(10)       // Fixed-length string
t.text()         // Unlimited text
```

#### Date/Time Types
```typescript
t.date()         // Date only
t.time()         // Time only
t.timestamp()    // Date and time
t.timestamptz()  // Date and time with timezone
```

#### Other Types
```typescript
t.boolean()      // True/false
t.uuid()         // UUID v4
t.json()         // JSON object
t.jsonb()        // JSON binary
```

#### Relationships
```typescript
t.foreignKey('TableName', 'column')  // Foreign key reference
```

### Field Modifiers

Chain modifiers to configure field behavior and constraints:

```typescript
// Constraints
.primaryKey()           // Mark as primary key
.unique()              // Enforce uniqueness
.notNull()             // Cannot be null
.nullable()            // Can be null (default)

// Defaults
.default(value)        // Set default value
.default('now')        // Special: current timestamp

// Ranges (for numeric types)
.min(18)               // Minimum value
.max(90)               // Maximum value

// Enums
.enum(['draft', 'published', 'archived'])

// Custom generation
.generate('internet.email')           // Use Faker.js method
.generate(() => Math.random() * 100)  // Custom function
```

## Advanced Usage

### Multi-Table Schemas

You can organize schemas in two ways:

**Option 1: Single file with multiple tables**

Define multiple related tables in a single file:

```typescript
// schemas/social.schema.ts
import { t } from '@doviui/dev-db'

export default {
  User: {
    $count: 100,
    id: t.bigserial().primaryKey(),
    username: t.varchar(50).unique()
  },

  Post: {
    $count: 500,
    id: t.bigserial().primaryKey(),
    user_id: t.foreignKey('User', 'id'),
    title: t.varchar(200)
  },

  Comment: {
    $count: 2000,
    id: t.uuid().primaryKey(),
    post_id: t.foreignKey('Post', 'id'),
    user_id: t.foreignKey('User', 'id'),
    content: t.text()
  }
}
```

**Option 2: Multiple files in a directory**

Organize each table in its own file for better maintainability:

```typescript
// schemas/users.ts
import { t } from '@doviui/dev-db'

export default {
  User: {
    $count: 100,
    id: t.bigserial().primaryKey(),
    username: t.varchar(50).unique()
  }
}
```

```typescript
// schemas/posts.ts
import { t } from '@doviui/dev-db'

export default {
  Post: {
    $count: 500,
    id: t.bigserial().primaryKey(),
    user_id: t.foreignKey('User', 'id'),
    title: t.varchar(200)
  }
}
```

```typescript
// schemas/comments.ts
import { t } from '@doviui/dev-db'

export default {
  Comment: {
    $count: 2000,
    id: t.uuid().primaryKey(),
    post_id: t.foreignKey('Post', 'id'),
    user_id: t.foreignKey('User', 'id'),
    content: t.text()
  }
}
```

Then generate with: `bunx @doviui/dev-db ./schemas`

### Schema Validation

dev-db validates schemas before generation to catch errors early:

```typescript
// ❌ This will fail validation
export default {
  Post: {
    id: t.bigserial().primaryKey(),
    user_id: t.foreignKey('User', 'id')  // Error: User table doesn't exist!
  }
}
```

**Output:**
```
Schema validation failed:

  Post.user_id: Foreign key references non-existent table 'User'
```

### Custom Data Generators

Leverage any [Faker.js](https://fakerjs.dev/) method for realistic data generation:

```typescript
t.varchar(100).generate('company.name')
t.varchar(50).generate('location.city')
t.integer().generate('number.int', { min: 1000, max: 9999 })
```

Or write custom functions:

```typescript
t.varchar(20).generate(() => {
  const colors = ['red', 'blue', 'green', 'yellow']
  return colors[Math.floor(Math.random() * colors.length)]
})

t.jsonb().generate((faker) => ({
  preferences: {
    theme: faker.helpers.arrayElement(['light', 'dark']),
    language: faker.helpers.arrayElement(['en', 'es', 'fr'])
  },
  lastLogin: faker.date.recent().toISOString()
}))
```

## Command Line Interface

```bash
dev-db <path> [options]

Arguments:
  <path>                 Path to schema file or directory containing schema files

Options:
  -o, --output <dir>     Output directory for generated JSON files (default: ./mock-data)
  -s, --seed <number>    Random seed for reproducible data generation
  -t, --types            Generate TypeScript type definitions alongside JSON
  -h, --help             Show help message
```

**Examples:**

```bash
# Single file
bunx @doviui/dev-db schema.ts

# Directory of schemas
bunx @doviui/dev-db ./schemas

# Custom output directory
bunx @doviui/dev-db ./schemas -o ./data

# Reproducible generation with seed
bunx @doviui/dev-db schema.ts -s 42

# Generate TypeScript types
bunx @doviui/dev-db schema.ts --types

# All options combined
bunx @doviui/dev-db ./schemas --output ./database --seed 12345 --types
```

**Schema File Format:**

Schema files must export a default object or named `schema` export:

```typescript
import { t } from '@doviui/dev-db';

export default {
  User: {
    $count: 100,
    id: t.bigserial().primaryKey(),
    email: t.varchar(255).unique().notNull().generate('internet.email'),
    name: t.varchar(100).notNull()
  }
};
```

**Directory Support:**

When a directory is provided, all `.ts` and `.js` files are loaded and their schemas are merged. This allows you to organize schemas across multiple files:

```
schemas/
  ├── users.ts      // exports { User: { ... } }
  ├── posts.ts      // exports { Post: { ... } }
  └── comments.ts   // exports { Comment: { ... } }
```

Running `bunx @doviui/dev-db ./schemas` will merge all three schemas and generate data for all tables.

### Programmatic API

For more control, create a custom generation script:

```typescript
// scripts/generate-data.ts
import { MockDataGenerator, SchemaValidator } from '@doviui/dev-db'
import { schema } from './schemas/index'

// Validate schema
const validator = new SchemaValidator()
const errors = validator.validate(schema)

if (errors.length > 0) {
  console.error('Schema validation failed:')
  errors.forEach(err => {
    const location = err.field ? `${err.table}.${err.field}` : err.table
    console.error(`  ${location}: ${err.message}`)
  })
  process.exit(1)
}

// Generate data
const generator = new MockDataGenerator(schema, {
  outputDir: './mock-data',
  seed: process.env.SEED ? parseInt(process.env.SEED) : undefined
})

await generator.generate()
console.log('Mock data generated successfully!')
```

Add to package.json:

```json
{
  "scripts": {
    "generate:data": "bun run scripts/generate-data.ts"
  }
}
```

Then run with:

```bash
bun run generate:data
# or with a custom seed
SEED=42 bun run generate:data
```

## Real-World Examples

### E-Commerce Platform

```typescript
// schemas/ecommerce.schema.ts
import { t } from '@doviui/dev-db'

export default {
  Customer: {
    $count: 200,
    id: t.uuid().primaryKey(),
    email: t.varchar(255).unique().generate('internet.email'),
    first_name: t.varchar(50).generate('person.firstName'),
    last_name: t.varchar(50).generate('person.lastName'),
    phone: t.varchar(20).generate('phone.number'),
    created_at: t.timestamptz().default('now')
  },
  
  Product: {
    $count: 100,
    id: t.bigserial().primaryKey(),
    name: t.varchar(200).generate('commerce.productName'),
    description: t.text().generate('commerce.productDescription'),
    price: t.decimal(10, 2).min(5).max(5000),
    stock: t.integer().min(0).max(1000),
    category: t.varchar(50).enum(['electronics', 'clothing', 'home', 'books'])
  },
  
  Order: {
    $count: 500,
    id: t.bigserial().primaryKey(),
    customer_id: t.foreignKey('Customer', 'id').notNull(),
    status: t.varchar(20).enum(['pending', 'processing', 'shipped', 'delivered']),
    total: t.decimal(10, 2).min(10).max(10000),
    created_at: t.timestamptz().default('now')
  },
  
  OrderItem: {
    $count: 1500,
    id: t.bigserial().primaryKey(),
    order_id: t.foreignKey('Order', 'id').notNull(),
    product_id: t.foreignKey('Product', 'id').notNull(),
    quantity: t.integer().min(1).max(10),
    price: t.decimal(10, 2)
  }
}
```

### Blog Platform

```typescript
// schemas/blog.schema.ts
import { t } from '@doviui/dev-db'

export default {
  Author: {
    $count: 50,
    id: t.uuid().primaryKey(),
    username: t.varchar(50).unique().generate('internet.userName'),
    email: t.varchar(255).unique().generate('internet.email'),
    bio: t.text().generate('lorem.paragraph'),
    avatar_url: t.varchar(500).generate('image.avatar')
  },
  
  Article: {
    $count: 300,
    id: t.bigserial().primaryKey(),
    author_id: t.foreignKey('Author', 'id'),
    title: t.varchar(200).generate('lorem.sentence'),
    slug: t.varchar(200).unique().generate('lorem.slug'),
    content: t.text().generate('lorem.paragraphs', 5),
    excerpt: t.varchar(500).generate('lorem.paragraph'),
    published: t.boolean(),
    published_at: t.timestamptz().nullable(),
    created_at: t.timestamptz().default('now')
  },
  
  Tag: {
    $count: 30,
    id: t.serial().primaryKey(),
    name: t.varchar(50).unique().generate('lorem.word')
  },
  
  ArticleTag: {
    $count: 800,
    article_id: t.foreignKey('Article', 'id'),
    tag_id: t.foreignKey('Tag', 'id')
  }
}
```

## Best Practices

### Schema Design

**Define independent tables first** - Structure your schemas so tables without foreign keys are defined before those with dependencies. This simplifies validation and generation.

**Use realistic record counts** - Set `$count` values that reflect production ratios. For example, if users typically have 5 posts, generate 100 users and 500 posts.

**Leverage domain-specific generators** - Use Faker.js methods that match your domain (e.g., `company.name` for business data, `person.firstName` for user data) to generate realistic datasets.

### Development Workflow

**Validate frequently** - Run generation regularly during schema development to catch errors early. The validator provides immediate feedback on structural issues.

**Use seeds for reproducibility** - In test environments and CI/CD, use the `--seed` option to generate identical datasets across runs. This ensures consistent test results.

**Organize by domain** - Group related tables in single schema files (e.g., `auth.schema.ts`, `orders.schema.ts`) for better maintainability and clearer relationships.

## Troubleshooting

### Foreign Key Validation Errors

**Problem**: `Foreign key references non-existent table 'TableName'`

**Solution**: Ensure all referenced tables are defined in your schema before tables that reference them:

```typescript
// ✅ Correct - User defined before Post
export default {
  User: {
    id: t.bigserial().primaryKey(),
    // ... other fields
  },
  Post: {
    id: t.bigserial().primaryKey(),
    user_id: t.foreignKey('User', 'id')  // User exists in schema
  }
}
```

### Unique Constraint Errors

**Problem**: `Could not generate unique value after 1000 attempts`

**Solution**: This occurs when unique constraints are too restrictive for the number of records. Consider these options:

- **Increase variety**: Use a more diverse Faker.js generator that produces more unique values
- **Reduce record count**: Lower the `$count` if you don't need that many records
- **Remove constraint**: If uniqueness isn't critical for your use case, remove the `.unique()` modifier

### Circular Dependency Errors

**Problem**: `Circular dependency detected involving table: TableName`

**Solution**: dev-db cannot resolve circular foreign key relationships. Restructure your schema using one of these approaches:

- **Make relationships optional**: Use `.nullable()` on one of the foreign keys
- **Introduce a junction table**: Break the circular dependency with an intermediary table
- **Reconsider the model**: Circular dependencies often indicate a modeling issue

## Contributing

We welcome contributions! Whether you're fixing bugs, improving documentation, or proposing new features, your input helps make dev-db better for everyone.

Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

dev-db is built with:
- [Faker.js](https://fakerjs.dev/) - High-quality fake data generation
- [Bun](https://bun.sh/) - Fast JavaScript runtime and toolkit