# better-sqlite3 [![Build Status](https://github.com/JoshuaWise/better-sqlite3/actions/workflows/build.yml/badge.svg)](https://github.com/JoshuaWise/better-sqlite3/actions/workflows/build.yml?query=branch%3Amaster)

The fastest and simplest library for SQLite in Node.js.

- Full transaction support
- High performance, efficiency, and safety
- Easy-to-use synchronous API *(better concurrency than an asynchronous API... yes, you read that correctly)*
- Support for user-defined functions, aggregates, virtual tables, and extensions
- 64-bit integers *(invisible until you need them)*
- Worker thread support *(for large/slow queries)*

## Help this project stay strong! &#128170;

`better-sqlite3` is used by thousands of developers and engineers on a daily basis. Long nights and weekends were spent keeping this project strong and dependable, with no ask for compensation or funding, until now. If your company uses `better-sqlite3`, ask your manager to consider supporting the project:

- [Become a GitHub sponsor](https://github.com/sponsors/JoshuaWise)
- [Become a backer on Patreon](https://www.patreon.com/joshuawise)
- [Make a one-time donation on PayPal](https://www.paypal.me/joshuathomaswise)

## How other libraries compare

|   |select 1 row &nbsp;`get()`&nbsp;|select 100 rows &nbsp;&nbsp;`all()`&nbsp;&nbsp;|select 100 rows `iterate()` 1-by-1|insert 1 row `run()`|insert 100 rows in a transaction|
|---|---|---|---|---|---|
|better-sqlite3|1x|1x|1x|1x|1x|
|[sqlite](https://www.npmjs.com/package/sqlite) and [sqlite3](https://www.npmjs.com/package/sqlite3)|11.7x slower|2.9x slower|24.4x slower|2.8x slower|15.6x slower|

> You can verify these results by [running the benchmark yourself](./docs/benchmark.md).

## Installation

```bash
npm install better-sqlite3
```

> Requires Node.js v14.21.1 or later. Prebuilt binaries are available for [LTS versions](https://nodejs.org/en/about/releases/). If you have trouble installing, check the [troubleshooting guide](./docs/troubleshooting.md).

## Usage

```js
const db = require('better-sqlite3')('foobar.db', options);

const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
console.log(row.firstName, row.lastName, row.email);
```

Though not required, [it is generally important to set the WAL pragma for performance reasons](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md).

```js
db.pragma('journal_mode = WAL');
```

##### In ES6 module notation:

```js
import Database from 'better-sqlite3';
const db = new Database('foobar.db', options);
db.pragma('journal_mode = WAL');
```

## Query Builder (Laravel-like Fluent Interface)

`better-sqlite3` now includes a Laravel-inspired Query Builder for fluent, chainable query building:

```js
const db = require('better-sqlite3')('foobar.db');
const unifiedDb = db.createQueryBuilder();

// Create tables with schema builder
unifiedDb.schema().create('users', (table) => {
  table.id();
  table.string('name');
  table.string('email');
  table.timestamps();
});

// Fluent query building
const users = unifiedDb
  .table('users')
  .where('status', 'active')
  .orderBy('name')
  .limit(10)
  .get();

// INSERT
unifiedDb.table('users').insert({ name: 'John', email: 'john@example.com' });

// UPDATE
unifiedDb.table('users').where('id', 1).update({ status: 'inactive' });

// DELETE
unifiedDb.table('users').where('id', 1).delete();
```

The Query Builder follows a **polymorphic design pattern** with optional storage backends and maintains full backward compatibility with the traditional `better-sqlite3` API.

For comprehensive documentation, see the [Query Builder guide](./QUERY_BUILDER_GUIDE.md).

## Why should I use this instead of [node-sqlite3](https://github.com/mapbox/node-sqlite3)?

- `node-sqlite3` uses asynchronous APIs for tasks that are either CPU-bound or serialized. That's not only bad design, but it wastes tons of resources. It also causes [mutex thrashing](https://en.wikipedia.org/wiki/Resource_contention) which has devastating effects on performance.
- `node-sqlite3` exposes low-level (C language) memory management functions. `better-sqlite3` does it the JavaScript way, allowing the garbage collector to worry about memory management.
- `better-sqlite3` is simpler to use, and it provides nice utilities for some operations that are very difficult or impossible in `node-sqlite3`.
- `better-sqlite3` is much faster than `node-sqlite3` in most cases, and just as fast in all other cases.

#### When is this library not appropriate?

In most cases, if you're attempting something that cannot be reasonably accomplished with `better-sqlite3`, it probably cannot be reasonably accomplished with SQLite in general. For example, if you're executing queries that take one second to complete, and you expect to have many concurrent users executing those queries, no amount of asynchronicity will save you from SQLite's serialized nature. Fortunately, SQLite is very *very* fast. With proper indexing, we've been able to achieve upward of 2000 queries per second with 5-way-joins in a 60 GB database, where each query was handling 5–50 kilobytes of real data.

If you have a performance problem, the most likely causes are inefficient queries, improper indexing, or a lack of [WAL mode](./docs/performance.md)—not `better-sqlite3` itself. However, there are some cases where `better-sqlite3` could be inappropriate:

- If you expect a high volume of concurrent reads each returning many megabytes of data (i.e., videos)
- If you expect a high volume of concurrent writes (i.e., a social media site)
- If your database's size is near the terabyte range

For these situations, you should probably use a full-fledged RDBMS such as [PostgreSQL](https://www.postgresql.org/).

## Upgrading

Upgrading your `better-sqlite3` dependency can potentially introduce breaking changes, either in the `better-sqlite3` API (if you upgrade to a new [major version](https://semver.org/)), or between your existing database(s) and the underlying version of SQLite. Before upgrading, review:

* [`better-sqlite3` release notes](https://github.com/WiseLibs/better-sqlite3/releases)
* [SQLite release history](https://www.sqlite.org/changes.html)

# Query Builder - Complete Reference

## Overview

The Query Builder provides a Laravel-inspired, fluent interface for building and executing SQL queries with better-sqlite3. It implements a **polymorphic design pattern** with the following components:

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

The Query Builder follows the **polymorphic design pattern**:

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

## Method Reference

### Query Builder Methods

| Method | Purpose |
|--------|---------|
| `from(table)` | Specify the table to query |
| `table(table)` | Alias for `from()` |
| `select(...columns)` | Specify columns to select (default: `*`) |
| `where(column, operator, value)` | Add WHERE condition |
| `orWhere(column, operator, value)` | Add OR WHERE condition |
| `join(table, on)` | Add INNER JOIN |
| `leftJoin(table, on)` | Add LEFT JOIN |
| `rightJoin(table, on)` | Add RIGHT JOIN |
| `orderBy(column, direction)` | Add ORDER BY clause (ASC/DESC) |
| `groupBy(...columns)` | Add GROUP BY clause |
| `having(column, operator, value)` | Add HAVING clause |
| `limit(count)` | Add LIMIT clause |
| `offset(count)` | Add OFFSET clause |
| `get()` | Execute and get all results |
| `first()` | Get first result only |
| `count(column)` | Count matching records |
| `insert(data)` | Insert one or more records |
| `update(data)` | Update matching records |
| `delete()` | Delete matching records |
| `toSql()` | Get compiled SQL string |

### Schema Builder Methods

| Method | Purpose |
|--------|---------|
| `create(table, callback)` | Create a new table |
| `drop(table)` | Drop a table |
| `dropIfExists(table)` | Drop if exists (no error) |
| `hasTable(table)` | Check if table exists |

### Column Type Methods

| Method | Description |
|--------|-------------|
| `id(name)` | Auto-increment primary key |
| `increments(name)` | Integer auto-increment |
| `string(name, length)` | Variable character string |
| `text(name)` | Large text field |
| `integer(name)` | Integer number |
| `boolean(name, default)` | Boolean value |
| `float(name)` | Floating point number |
| `double(name)` | Double precision number |
| `decimal(name, total, places)` | Fixed decimal number |
| `json(name)` | JSON data |
| `timestamps()` | created_at and updated_at |
| `softDeletes(name)` | Soft delete timestamp |

## Real-World Examples

### User Management

```javascript
// Create users table
unifiedDb.schema().create('users', (table) => {
  table.id();
  table.string('email');
  table.string('name');
  table.string('password');
  table.boolean('is_admin', false);
  table.timestamps();
});

// Add a user
unifiedDb.table('users').insert({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'hashed_password',
  is_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Find user by email
const user = unifiedDb.table('users')
  .where('email', 'user@example.com')
  .first();

// Get all admin users
const admins = unifiedDb.table('users')
  .where('is_admin', true)
  .orderBy('name')
  .get();

// Update user
unifiedDb.table('users')
  .where('id', user.id)
  .update({ password: 'new_hashed_password', updated_at: new Date().toISOString() });

// Delete user
unifiedDb.table('users')
  .where('id', user.id)
  .delete();
```

### E-Commerce Orders

```javascript
// Create orders table
unifiedDb.schema().create('orders', (table) => {
  table.id();
  table.integer('user_id');
  table.string('status');
  table.decimal('total', 10, 2);
  table.timestamps();
});

// Get user's pending orders
const orders = unifiedDb.table('orders')
  .where('user_id', 1)
  .where('status', 'pending')
  .orderBy('created_at', 'DESC')
  .get();

// Get orders with total > $100
const largeOrders = unifiedDb.table('orders')
  .where('total', '>', 100)
  .select('id', 'user_id', 'total', 'created_at')
  .get();

// Count orders by status
const statusCounts = unifiedDb.table('orders')
  .select('status', 'COUNT(*) as count')
  .groupBy('status')
  .get();

// Update order status with transaction
const updateOrderStatus = unifiedDb.transaction((orderId, newStatus) => {
  unifiedDb.table('orders')
    .where('id', orderId)
    .update({ status: newStatus, updated_at: new Date().toISOString() });
  unifiedDb.table('audit_log').insert({
    action: 'order_status_changed',
    order_id: orderId,
    new_status: newStatus,
    created_at: new Date().toISOString(),
  });
});

updateOrderStatus(1, 'completed');
```

### Blog with Comments

```javascript
// Get posts with comment count
const posts = unifiedDb.table('posts')
  .select('posts.id', 'posts.title', 'COUNT(comments.id) as comment_count')
  .leftJoin('comments', 'posts.id = comments.post_id')
  .groupBy('posts.id')
  .get();

// Get comments for a specific post
const comments = unifiedDb.table('comments')
  .where('post_id', 1)
  .where('approved', true)
  .orderBy('created_at', 'DESC')
  .get();

// Bulk delete unapproved comments
unifiedDb.table('comments')
  .where('approved', false)
  .where('created_at', '<', '2020-01-01')
  .delete();
```

# Documentation

- [API documentation](./docs/api.md)
- [Query Builder guide](./QUERY_BUILDER_GUIDE.md) - Comprehensive reference guide
- [Performance](./docs/performance.md) (also see [benchmark results](./docs/benchmark.md))
- [64-bit integer support](./docs/integer.md)
- [Worker thread support](./docs/threads.md)
- [Unsafe mode (advanced)](./docs/unsafe.md)
- [SQLite compilation (advanced)](./docs/compilation.md)
- [Contribution rules](./docs/contribution.md)
- [Code of conduct](./docs/conduct.md)

# License

[MIT](./LICENSE)
