# better-sqlite3

## Overview
A Node.js native addon library providing a fast, synchronous SQLite interface. This is a **library project**, not a web application — it has no frontend or web server.

**NEW**: Includes a Laravel-like Query Builder with polymorphic design pattern for fluent query building.

## Stack
- **Language**: JavaScript + C++ (native Node.js addon)
- **Build Tool**: node-gyp (via `prebuild-install || node-gyp rebuild --release`)
- **Package Manager**: npm
- **Test Framework**: Mocha + Chai
- **Node.js Version**: 20.x

## Project Structure
- `src/` - C++ source files for the native addon
- `lib/` - JavaScript public API wrapper
  - `database.js` - Core Database class
  - `query-builder.js` - **NEW** Laravel-like Query Builder with polymorphic design
- `deps/` - Bundled SQLite source and build configs
- `docs/` - API documentation
- `test/` - Mocha test suite (303 passing tests)
- `benchmark/` - Performance benchmarks
- `binding.gyp` - node-gyp build configuration
- `QUERY_BUILDER_GUIDE.md` - **NEW** Comprehensive Query Builder documentation

## Scripts
- `npm install` - Install deps and build the native addon
- `npm test` - Run the Mocha test suite
- `npm run build-release` - Rebuild native addon (release)
- `npm run build-debug` - Rebuild native addon (debug)
- `npm run benchmark` - Run performance benchmarks

## New Features: Query Builder

### Polymorphic Design Pattern
Follows the design pattern from the attached DB specification:

```
BaseStorage (abstract interface)
    └── SQLiteStorage (better-sqlite3 implementation)

UnifiedDB (polymorphic wrapper)
    └── provides consistent API for storage backends
```

### Exports
- `QueryBuilder` - Fluent query builder class
- `SchemaBuilder` - Migration and schema management
- `SQLiteStorage` - SQLite storage backend
- `BaseStorage` - Abstract storage interface
- `UnifiedDB` - Polymorphic database wrapper

### Quick Start
```javascript
const Database = require('better-sqlite3');
const db = new Database('my-database.db');

// Create Query Builder wrapper
const unifiedDb = db.createQueryBuilder();

// Use Laravel-like fluent interface
const users = unifiedDb
  .table('users')
  .where('status', 'active')
  .orderBy('name')
  .get();
```

## Backward Compatibility
- Query Builder is **optional** - traditional better-sqlite3 API still works
- All existing code continues to work unchanged
- No breaking changes to core Database class

## Workflow
The "Start application" workflow runs `npm test` in console mode.

## Notes
- 2 test failures are expected (require debug build of test_extension.node)
- The library loads and works correctly: `require('.')` returns the Database constructor
- New Query Builder is fully functional and chainable
