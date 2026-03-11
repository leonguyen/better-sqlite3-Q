'use strict';
const Database = require('./database');
const SqliteError = require('./sqlite-error');
const {
  QueryBuilder,
  SchemaBuilder,
  TableBuilder,
  SQLiteStorage,
  BaseStorage,
  UnifiedDB,
} = require('./query-builder');

module.exports = Database;
module.exports.SqliteError = SqliteError;
module.exports.QueryBuilder = QueryBuilder;
module.exports.SchemaBuilder = SchemaBuilder;
module.exports.TableBuilder = TableBuilder;
module.exports.SQLiteStorage = SQLiteStorage;
module.exports.BaseStorage = BaseStorage;

/**
 * Create a UnifiedDB wrapper for fluent query building
 * Usage: const db = require('better-sqlite3')('file.db');
 *        const unifiedDb = db.createQueryBuilder();
 *        await unifiedDb.table('users').where('id', 1).get();
 */
Database.prototype.createQueryBuilder = function() {
  return new UnifiedDB(this);
};
