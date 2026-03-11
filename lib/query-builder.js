'use strict';

/**
 * Base Storage Interface for polymorphic database access
 * Defines the contract for different storage implementations
 */
class BaseStorage {
  async connect() {
    throw new Error('connect() method must be implemented');
  }

  table(tableName) {
    throw new Error('table() method must be implemented');
  }

  schema() {
    throw new Error('schema() method must be implemented');
  }
}

/**
 * Fluent Query Builder
 * Implements Laravel-like query building with method chaining
 */
class QueryBuilder {
  constructor(database, tableName = null) {
    this.database = database;
    this._table = tableName;
    this._wheres = [];
    this._orWheres = [];
    this._selects = [];
    this._limit = null;
    this._offset = null;
    this._orderBy = [];
    this._joins = [];
    this._groupBy = [];
    this._havings = [];
    this._bindings = [];
  }

  /**
   * Specify which table to query from
   */
  from(tableName) {
    this._table = tableName;
    return this;
  }

  /**
   * Add a WHERE condition
   */
  where(column, operator, value) {
    // Handle where(column, value) shorthand
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this._wheres.push({ column, operator, value });
    return this;
  }

  /**
   * Add an OR WHERE condition
   */
  orWhere(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this._orWheres.push({ column, operator, value });
    return this;
  }

  /**
   * Specify columns to select
   */
  select(...columns) {
    this._selects = columns.length > 0 ? columns : ['*'];
    return this;
  }

  /**
   * Add LIMIT to query
   */
  limit(count) {
    this._limit = count;
    return this;
  }

  /**
   * Add OFFSET to query
   */
  offset(count) {
    this._offset = count;
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column, direction = 'ASC') {
    this._orderBy.push({ column, direction: direction.toUpperCase() });
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(...columns) {
    this._groupBy.push(...columns);
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this._havings.push({ column, operator, value });
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table, on) {
    this._joins.push({ type: 'INNER JOIN', table, on });
    return this;
  }

  /**
   * Add LEFT JOIN clause
   */
  leftJoin(table, on) {
    this._joins.push({ type: 'LEFT JOIN', table, on });
    return this;
  }

  /**
   * Add RIGHT JOIN clause
   */
  rightJoin(table, on) {
    this._joins.push({ type: 'RIGHT JOIN', table, on });
    return this;
  }

  /**
   * Build and return the compiled SQL query
   */
  toSql() {
    if (!this._table) {
      throw new Error('No table specified. Use from() or table() first.');
    }

    let sql = 'SELECT ';

    // SELECT clause
    if (this._selects.length === 0) {
      sql += '*';
    } else {
      sql += this._selects.join(', ');
    }

    sql += ` FROM ${this._table}`;

    // JOIN clauses
    this._joins.forEach((join) => {
      sql += ` ${join.type} ${join.table} ON ${join.on}`;
    });

    // WHERE clauses
    if (this._wheres.length > 0 || this._orWheres.length > 0) {
      sql += ' WHERE ';

      // AND conditions
      const whereClauses = this._wheres.map(
        (w) => `${w.column} ${w.operator} ?`
      );
      sql += whereClauses.join(' AND ');

      // OR conditions
      if (this._orWheres.length > 0) {
        if (this._wheres.length > 0) {
          sql += ' OR ';
        }
        const orClauses = this._orWheres.map(
          (w) => `${w.column} ${w.operator} ?`
        );
        sql += orClauses.join(' OR ');
      }
    }

    // GROUP BY clause
    if (this._groupBy.length > 0) {
      sql += ` GROUP BY ${this._groupBy.join(', ')}`;
    }

    // HAVING clause
    if (this._havings.length > 0) {
      sql += ' HAVING ';
      const havingClauses = this._havings.map(
        (h) => `${h.column} ${h.operator} ?`
      );
      sql += havingClauses.join(' AND ');
    }

    // ORDER BY clause
    if (this._orderBy.length > 0) {
      sql += ' ORDER BY ';
      const orderClauses = this._orderBy.map(
        (o) => `${o.column} ${o.direction}`
      );
      sql += orderClauses.join(', ');
    }

    // LIMIT and OFFSET
    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
    }

    if (this._offset !== null) {
      sql += ` OFFSET ${this._offset}`;
    }

    return sql;
  }

  /**
   * Collect all bindings for the query
   */
  _getBindings() {
    const bindings = [];

    // Collect WHERE bindings
    this._wheres.forEach((w) => bindings.push(w.value));

    // Collect OR WHERE bindings
    this._orWheres.forEach((w) => bindings.push(w.value));

    // Collect HAVING bindings
    this._havings.forEach((h) => bindings.push(h.value));

    return bindings;
  }

  /**
   * Execute the query and get all results
   */
  get() {
    const sql = this.toSql();
    const bindings = this._getBindings();
    const stmt = this.database.prepare(sql);
    return stmt.all(...bindings);
  }

  /**
   * Execute the query and get the first result
   */
  first() {
    const sql = this.toSql();
    const bindings = this._getBindings();
    const stmt = this.database.prepare(sql);
    return stmt.get(...bindings) || null;
  }

  /**
   * Count the records
   */
  count(column = '*') {
    const originalSelects = this._selects;
    this._selects = [`COUNT(${column}) as count`];

    const result = this.first();
    this._selects = originalSelects;

    return result ? result.count : 0;
  }

  /**
   * Insert a single record or array of records
   */
  insert(data) {
    const isArray = Array.isArray(data);
    const records = isArray ? data : [data];

    if (records.length === 0) {
      throw new Error('No data provided for insert');
    }

    const firstRecord = records[0];
    const columns = Object.keys(firstRecord);
    const placeholders = columns.map(() => '?').join(', ');
    const columnsList = columns.join(', ');

    const sql = `INSERT INTO ${this._table} (${columnsList}) VALUES (${placeholders})`;
    const stmt = this.database.prepare(sql);

    const insertMany = this.database.transaction((records) => {
      for (const record of records) {
        const values = columns.map((col) => record[col]);
        stmt.run(...values);
      }
    });

    insertMany(records);
    return this;
  }

  /**
   * Update records matching the query
   */
  update(data) {
    const columns = Object.keys(data);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    let sql = `UPDATE ${this._table} SET ${setClause}`;

    // Add WHERE clause
    if (this._wheres.length > 0 || this._orWheres.length > 0) {
      sql += ' WHERE ';

      const whereClauses = this._wheres.map(
        (w) => `${w.column} ${w.operator} ?`
      );
      sql += whereClauses.join(' AND ');

      if (this._orWheres.length > 0) {
        if (this._wheres.length > 0) {
          sql += ' OR ';
        }
        const orClauses = this._orWheres.map(
          (w) => `${w.column} ${w.operator} ?`
        );
        sql += orClauses.join(' OR ');
      }
    }

    const updateValues = columns.map((col) => data[col]);
    const allBindings = [...updateValues, ...this._getBindings()];

    const stmt = this.database.prepare(sql);
    return stmt.run(...allBindings);
  }

  /**
   * Delete records matching the query
   */
  delete() {
    let sql = `DELETE FROM ${this._table}`;

    // Add WHERE clause
    if (this._wheres.length > 0 || this._orWheres.length > 0) {
      sql += ' WHERE ';

      const whereClauses = this._wheres.map(
        (w) => `${w.column} ${w.operator} ?`
      );
      sql += whereClauses.join(' AND ');

      if (this._orWheres.length > 0) {
        if (this._wheres.length > 0) {
          sql += ' OR ';
        }
        const orClauses = this._orWheres.map(
          (w) => `${w.column} ${w.operator} ?`
        );
        sql += orClauses.join(' OR ');
      }
    }

    if (this._wheres.length === 0 && this._orWheres.length === 0) {
      throw new Error(
        'Deleting without WHERE clause is dangerous. Use .where() or force with db.prepare("DELETE FROM ...").run()'
      );
    }

    const stmt = this.database.prepare(sql);
    return stmt.run(...this._getBindings());
  }
}

/**
 * SQLite Storage Implementation
 * Extends BaseStorage to work with better-sqlite3
 */
class SQLiteStorage extends BaseStorage {
  constructor(database) {
    super();
    this.database = database;
    this._schemaBuilder = null;
  }

  async connect() {
    return true;
  }

  table(tableName) {
    return new QueryBuilder(this.database, tableName);
  }

  schema() {
    return new SchemaBuilder(this.database);
  }
}

/**
 * Schema Builder for migrations
 */
class SchemaBuilder {
  constructor(database) {
    this.database = database;
  }

  create(tableName, callback) {
    const builder = new TableBuilder(tableName);
    callback(builder);
    const sql = builder.toCreateSql();
    this.database.exec(sql);
    return this;
  }

  drop(tableName) {
    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    this.database.exec(sql);
    return this;
  }

  dropIfExists(tableName) {
    return this.drop(tableName);
  }

  hasTable(tableName) {
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    const stmt = this.database.prepare(sql);
    return stmt.get(tableName) !== undefined;
  }
}

/**
 * Table Builder for defining table schemas
 */
class TableBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.columns = [];
    this.primaryKey = null;
  }

  increments(name) {
    this.columns.push(`${name} INTEGER PRIMARY KEY AUTOINCREMENT`);
    this.primaryKey = name;
    return this;
  }

  id(name = 'id') {
    return this.increments(name);
  }

  string(name, length = 255) {
    this.columns.push(`${name} VARCHAR(${length})`);
    return this;
  }

  text(name) {
    this.columns.push(`${name} TEXT`);
    return this;
  }

  integer(name) {
    this.columns.push(`${name} INTEGER`);
    return this;
  }

  boolean(name, defaultValue = null) {
    let col = `${name} BOOLEAN`;
    if (defaultValue !== null) {
      col += ` DEFAULT ${defaultValue ? 1 : 0}`;
    }
    this.columns.push(col);
    return this;
  }

  float(name, total = 8, places = 2) {
    this.columns.push(`${name} FLOAT`);
    return this;
  }

  double(name, total = 15, places = 8) {
    this.columns.push(`${name} DOUBLE`);
    return this;
  }

  decimal(name, total = 8, places = 2) {
    this.columns.push(`${name} DECIMAL(${total},${places})`);
    return this;
  }

  json(name) {
    this.columns.push(`${name} JSON`);
    return this;
  }

  timestamps() {
    this.columns.push(`created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    this.columns.push(`updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    return this;
  }

  softDeletes(name = 'deleted_at') {
    this.columns.push(`${name} DATETIME NULL`);
    return this;
  }

  toCreateSql() {
    if (this.columns.length === 0) {
      throw new Error('No columns defined for table');
    }

    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (${this.columns.join(
      ', '
    )})`;
  }
}

/**
 * Unified Database Interface
 * Provides polymorphic access to different storage backends
 */
class UnifiedDB {
  constructor(database) {
    this.database = database;
    this.storage = new SQLiteStorage(database);
  }

  async connect() {
    return this.storage.connect();
  }

  table(tableName) {
    return this.storage.table(tableName);
  }

  schema() {
    return this.storage.schema();
  }

  /**
   * Raw SQL query execution
   */
  raw(sql, bindings = []) {
    const stmt = this.database.prepare(sql);
    return stmt.all(...bindings);
  }

  /**
   * Transaction support
   */
  transaction(callback) {
    return this.database.transaction(callback);
  }

  /**
   * Direct access to the underlying database
   */
  getDatabase() {
    return this.database;
  }
}

module.exports = {
  QueryBuilder,
  SchemaBuilder,
  TableBuilder,
  SQLiteStorage,
  BaseStorage,
  UnifiedDB,
};
