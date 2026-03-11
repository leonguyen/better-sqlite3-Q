# Query Builder - Laravel-like Fluent Interface

The Query Builder provides a Laravel-inspired, fluent interface for building and executing SQL queries with better-sqlite3.

## Overview

The Query Builder implements a **polymorphic design pattern** with the following components:

- **BaseStorage**: Abstract interface for storage implementations
- **SQLiteStorage**: SQLite-specific storage backend
- **QueryBuilder**: Fluent query building with method chaining
- **SchemaBuilder**: Migration and schema management
- **UnifiedDB**: Polymorphic database wrapper

## Installation & Setup

```javascript
const Database = require('better-sqlite3');
const db = new Database('my-database.db');

// Create a UnifiedDB wrapper for fluent queries
const unifiedDb = db.createQueryBuilder();
```

## Basic Usage

### SELECT Queries

```javascript
// Get all records
const users = unifiedDb
  .table('users')
  .get();

// Get first record
const user = unifiedDb
  .table('users')
  .where('id', 1)
  .first();

// Select specific columns
const names = unifiedDb
  .table('users')
  .select('id', 'name', 'email')
  .get();

// Count records
const count = unifiedDb
  .table('users')
  .where('status', 'active')
  .count();
```

### WHERE Conditions

```javascript
// Simple equality
unifiedDb.table('users').where('name', 'John').get();

// Comparison operators
unifiedDb.table('users').where('age', '>', 18).get();
unifiedDb.table('users').where('age', '>=', 21).get();
unifiedDb.table('users').where('age', '<', 65).get();
unifiedDb.table('users').where('age', '<=', 60).get();
unifiedDb.table('users').where('status', '!=', 'active').get();

// OR conditions
unifiedDb.table('users')
  .where('status', 'active')
  .orWhere('status', 'pending')
  .get();
```

### Limiting & Ordering

```javascript
// Pagination
unifiedDb.table('users')
  .limit(10)
  .offset(20)
  .get();

// Order by
unifiedDb.table('users')
  .orderBy('name', 'ASC')
  .orderBy('created_at', 'DESC')
  .get();

// Group by
unifiedDb.table('orders')
  .select('user_id', 'COUNT(*) as total')
  .groupBy('user_id')
  .get();
```

### INSERT Operations

```javascript
// Insert single record
unifiedDb.table('users')
  .insert({ name: 'John', email: 'john@example.com' });

// Insert multiple records
unifiedDb.table('users')
  .insert([
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' },
  ]);
```

### UPDATE Operations

```javascript
// Update records matching conditions
unifiedDb.table('users')
  .where('id', 1)
  .update({ name: 'Updated Name', status: 'inactive' });

// Update all records matching multiple conditions
unifiedDb.table('users')
  .where('status', 'active')
  .orWhere('status', 'pending')
  .update({ last_active: new Date().toISOString() });
```

### DELETE Operations

```javascript
// Delete records matching conditions
unifiedDb.table('users')
  .where('id', 1)
  .delete();

// Delete with multiple conditions
unifiedDb.table('users')
  .where('status', 'inactive')
  .orWhere('created_at', '<', '2020-01-01')
  .delete();

// Note: Deleting without WHERE clause is prevented for safety
```

### JOINs

```javascript
// INNER JOIN
unifiedDb.table('users')
  .select('users.name', 'orders.total')
  .join('orders', 'users.id = orders.user_id')
  .get();

// LEFT JOIN
unifiedDb.table('users')
  .leftJoin('orders', 'users.id = orders.user_id')
  .get();

// RIGHT JOIN
unifiedDb.table('orders')
  .rightJoin('users', 'users.id = orders.user_id')
  .get();
```

## Schema Management

### Creating Tables

```javascript
unifiedDb.schema().create('users', (table) => {
  table.id();
  table.string('name');
  table.string('email');
  table.string('password');
  table.boolean('is_admin', false);
  table.timestamps();
});
```

### Available Column Types

- `id(name)` - Auto-incrementing primary key
- `increments(name)` - Integer auto-increment
- `string(name, length)` - VARCHAR(length)
- `text(name)` - TEXT
- `integer(name)` - INTEGER
- `boolean(name, defaultValue)` - BOOLEAN
- `float(name)` - FLOAT
- `double(name)` - DOUBLE
- `decimal(name, total, places)` - DECIMAL
- `json(name)` - JSON
- `timestamps()` - created_at & updated_at
- `softDeletes(name)` - Soft delete column

### Dropping Tables

```javascript
unifiedDb.schema().drop('users');
unifiedDb.schema().dropIfExists('old_table');
```

### Checking Tables

```javascript
const exists = unifiedDb.schema().hasTable('users');
```

## Advanced Features

### Raw SQL

```javascript
const results = unifiedDb.raw(
  'SELECT * FROM users WHERE age > ? AND status = ?',
  [18, 'active']
);
```

### Transactions

```javascript
const transaction = unifiedDb.transaction((action) => {
  unifiedDb.table('users').insert({ name: 'John' });
  unifiedDb.table('audit_log').insert({ action: 'user_created' });
});

transaction();
```

### Getting the Underlying Database

```javascript
const rawDb = unifiedDb.getDatabase();
const stmt = rawDb.prepare('SELECT * FROM users');
```

### Viewing Compiled SQL

```javascript
const sql = unifiedDb.table('users')
  .where('status', 'active')
  .orderBy('name')
  .toSql();

console.log(sql);
// SELECT * FROM users WHERE status = ? ORDER BY name ASC
```

## Design Pattern

The Query Builder follows the **polymorphic design pattern** from the attached DB specification:

```
BaseStorage (abstract)
    ├── SQLiteStorage (implementation for better-sqlite3)
    └── [Other storage backends can be added]

UnifiedDB
    └── provides polymorphic interface to any BaseStorage
```

This allows the Query Builder to work with different storage backends while maintaining a consistent, Laravel-like API.

## Backward Compatibility

The Query Builder is entirely optional. You can still use better-sqlite3 the traditional way:

```javascript
const Database = require('better-sqlite3');
const db = new Database('my-database.db');

// Use traditional better-sqlite3 API
const stmt = db.prepare('SELECT * FROM users');
const users = stmt.all();

// Or use the new Query Builder
const unifiedDb = db.createQueryBuilder();
const users2 = unifiedDb.table('users').get();
```

Both approaches work alongside each other.
