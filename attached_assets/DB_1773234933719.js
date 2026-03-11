// UnifiedDB.js - Polymorphic unified DB interface for Supabase + UniversalStorage

import config from './db.json';

const SUPABASE_URL = config.supabaseUrl;
const SUPABASE_KEY = config.supabaseKey;

// --------------------------------------------------------------------
// HTTP Request utility for Supabase
// --------------------------------------------------------------------
class Request {
  static async post(url, body, options = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: options.headers,
      body,
    });
    return response.text();
  }
}

// --------------------------------------------------------------------
// Base Storage interface for polymorphism
// --------------------------------------------------------------------
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

// --------------------------------------------------------------------
// Supabase Storage implementation (from DB.js)
// --------------------------------------------------------------------
class SupabaseStorage extends BaseStorage {
  constructor() {
    super();
    this.url = SUPABASE_URL;
    this.key = SUPABASE_KEY;

    // Migration Schema builder and schema
    this.SchemaBuilder = class {
      constructor(tableName) {
        this.tableName = tableName;
        this.columns = [];
      }
      increments(column) {
        this.columns.push(`${column} SERIAL PRIMARY KEY`);
        return this;
      }
      string(column, length = 255) {
        this.columns.push(`${column} VARCHAR(${length})`);
        return this;
      }
      integer(column) {
        this.columns.push(`${column} INTEGER`);
        return this;
      }
      boolean(column) {
        this.columns.push(`${column} BOOLEAN`);
        return this;
      }
      text(column) {
        this.columns.push(`${column} TEXT`);
        return this;
      }
      timestamps() {
        this.columns.push(`created_at TIMESTAMP DEFAULT NOW()`);
        this.columns.push(`updated_at TIMESTAMP DEFAULT NOW()`);
        return this;
      }
      unique(column) {
        this.columns.push(`UNIQUE (${column})`);
        return this;
      }
      getSQLCreate() {
        return `CREATE TABLE IF NOT EXISTS ${this.tableName} (${this.columns.join(', ')});`;
      }
      getSQLDrop() {
        return `DROP TABLE IF EXISTS ${this.tableName};`;
      }
    };

    this.Schema = {
      create: (tableName, callback) => {
        const builder = new this.SchemaBuilder(tableName);
        callback(builder);
        return this.Schema._execute(builder.getSQLCreate());
      },
      drop: (tableName) => {
        const builder = new this.SchemaBuilder(tableName);
        return this.Schema._execute(builder.getSQLDrop());
      },
      _execute: async (sql) => {
        const url = `${SUPABASE_URL}/rest/v1/rpc/execute_sql`;
        const body = JSON.stringify({ sql });
        const headers = {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        };
        try {
          const response = await Request.post(url, body, { headers });
          return JSON.parse(response);
        } catch (error) {
          console.error('Migration Error:', error);
          return null;
        }
      },
    };

    // QueryBuilder mimics Laravel fluent query builder syntax
    this.QueryBuilder = class {
      constructor() {
        this.baseUrl = SUPABASE_URL;
        this.apiKey = SUPABASE_KEY;
        this.path = '';
        this.query = {};
        this.body = null;
        this.method = 'GET';
        this.filters = [];
      }

      from(table) {
        this.path = `/${table}`;
        return this;
      }

      where(column, operator, value) {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        const supabaseOperator = this._mapOperator(operator);
        this.filters.push(`${column}.${supabaseOperator}.${value}`);
        return this;
      }

      orWhere(column, operator, value) {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        const supabaseOperator = this._mapOperator(operator);
        const filterString = `${column}.${supabaseOperator}.${value}`;
        if (this.query.or) {
          this.query.or += `,${filterString}`;
        } else {
          this.query.or = filterString;
        }
        return this;
      }

      limit(count) {
        this.query.limit = count;
        return this;
      }

      offset(count) {
        this.query.offset = count;
        return this;
      }

      select(...columns) {
        this.method = 'GET';
        this.query.select = columns.join(',');
        return this;
      }

      insert(data) {
        this.method = 'POST';
        this.body = JSON.stringify(data);
        return this;
      }

      update(data) {
        this.method = 'PATCH';
        this.body = JSON.stringify(data);
        return this;
      }

      delete() {
        this.method = 'DELETE';
        return this;
      }

      async get() {
        this._applyFilters();
        const url = new URL(`${this.baseUrl}/rest/v1${this.path}`);
        Object.keys(this.query).forEach((key) =>
          url.searchParams.append(key, this.query[key])
        );
        const options = {
          method: this.method,
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: this.body,
        };
        try {
          const response = await fetch(url.toString(), options);
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }

      _mapOperator(operator) {
        switch (operator) {
          case '=':
          case '==':
            return 'eq';
          case '>':
            return 'gt';
          case '>=':
            return 'gte';
          case '<':
            return 'lt';
          case '<=':
            return 'lte';
          case '!=':
          case '<>':
            return 'neq';
          case 'in':
            return 'in';
          case 'like':
            return 'like';
          default:
            return 'eq';
        }
      }

      _applyFilters() {
        if (this.filters.length > 0) {
          if (this.query.or) {
            const andFilters = this.filters.join(',');
            this.query.or = `and(${andFilters}),${this.query.or}`;
          } else {
            this.filters.forEach((filter) => {
              const [column, ...rest] = filter.split('.');
              const value = rest.join('.');
              if (this.query[column]) {
                this.query[column] += `,${value}`;
              } else {
                this.query[column] = value;
              }
            });
          }
        }
      }
    };
  }

  async connect() {
    return true; // No explicit connection needed for Supabase REST
  }

  table(tableName) {
    return new this.QueryBuilder().from(tableName);
  }

  schema() {
    return this.Schema;
  }
}

// --------------------------------------------------------------------
// Local UniversalStorage implementation wrapper
// --------------------------------------------------------------------
class LocalUniversalStorage extends BaseStorage {
  constructor() {
    super();
    if (!window.UniversalStorage) {
      throw new Error(
        'UniversalStorage.js must be loaded globally before this script runs.'
      );
    }
  }

  async connect() {
    // Init IndexedDB or LocalStorage ORM internally (usually automatic)
    return true;
  }

  table(tableName) {
    // Use UniversalStorage's chainable query builder
    return window.UniversalStorage.table(tableName);
  }

  schema() {
    // Provide basic schema stub (UniversalStorage does not expose detailed schema builder)
    return {
      create: async (tableName, callback) => {
        // Optional: call callback to mimic API; actual schema setup manual in IndexedDB
        if (callback) {
          callback({
            increments: () => {},
            string: () => {},
            integer: () => {},
            boolean: () => {},
            text: () => {},
            timestamps: () => {},
            unique: () => {},
          });
        }
        return true;
      },
      drop: async (tableName) => {
        // Manually clear or delete store, if supported by UniversalStorage
        return true;
      },
    };
  }

  async backup() {
    if (window.UniversalStorage?.backup) {
      return window.UniversalStorage.backup();
    }
    throw new Error('Backup not supported on this platform.');
  }

  async restore(blob) {
    if (window.UniversalStorage?.restore) {
      return window.UniversalStorage.restore(blob);
    }
    throw new Error('Restore not supported on this platform.');
  }
}

// --------------------------------------------------------------------
// UnifiedDB polymorphic class
// --------------------------------------------------------------------
class UnifiedDB {
  constructor(mode = 'supabase') {
    this.mode = mode;
    this.storage = mode === 'local' ? new LocalUniversalStorage() : new SupabaseStorage();
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

  async backup() {
    if (this.mode === 'local') {
      return this.storage.backup();
    }
    throw new Error('Backup is only available in local mode.');
  }

  async restore(blob) {
    if (this.mode === 'local') {
      return this.storage.restore(blob);
    }
    throw new Error('Restore is only available in local mode.');
  }

  switchMode(newMode) {
    if (newMode !== this.mode) {
      this.mode = newMode;
      this.storage = newMode === 'local' ? new LocalUniversalStorage() : new SupabaseStorage();
    }
  }
}

const DB = new UnifiedDB();

export default DB;
