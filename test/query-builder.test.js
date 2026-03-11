const Database = require('../');
const { QueryBuilder, UnifiedDB } = require('../lib/query-builder');
const assert = require('assert');

describe('Query Builder - Laravel-like Interface', () => {
  let db;
  let unifiedDb;

  before(() => {
    db = new Database(':memory:');
    unifiedDb = db.createQueryBuilder();

    // Create test table
    unifiedDb.schema().create('users', (table) => {
      table.id();
      table.string('name');
      table.string('email');
      table.string('status');
      table.timestamps();
    });
  });

  after(() => {
    db.close();
  });

  describe('INSERT', () => {
    it('should insert a single record', () => {
      unifiedDb.table('users').insert({
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const user = unifiedDb.table('users').where('name', 'John Doe').first();
      assert.strictEqual(user.name, 'John Doe');
      assert.strictEqual(user.email, 'john@example.com');
    });

    it('should insert multiple records', () => {
      unifiedDb.table('users').insert([
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          status: 'inactive',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const count = unifiedDb.table('users').count();
      assert.strictEqual(count, 3);
    });
  });

  describe('SELECT', () => {
    it('should retrieve all records', () => {
      const users = unifiedDb.table('users').get();
      assert.strictEqual(users.length, 3);
    });

    it('should retrieve first record', () => {
      const user = unifiedDb.table('users').first();
      assert(user);
      assert(user.id);
    });

    it('should select specific columns', () => {
      const results = unifiedDb
        .table('users')
        .select('id', 'name')
        .get();

      assert(results[0].id);
      assert(results[0].name);
      assert(!results[0].email);
    });

    it('should apply WHERE condition', () => {
      const user = unifiedDb.table('users').where('status', 'active').first();
      assert.strictEqual(user.status, 'active');
    });

    it('should apply LIMIT', () => {
      const users = unifiedDb.table('users').limit(1).get();
      assert.strictEqual(users.length, 1);
    });

    it('should apply ORDER BY', () => {
      const users = unifiedDb
        .table('users')
        .orderBy('name', 'ASC')
        .get();

      assert.strictEqual(users[0].name, 'Bob Johnson');
    });

    it('should count records', () => {
      const total = unifiedDb.table('users').count();
      assert.strictEqual(total, 3);

      const activeCount = unifiedDb.table('users').where('status', 'active').count();
      assert.strictEqual(activeCount, 2);
    });
  });

  describe('UPDATE', () => {
    it('should update records matching WHERE', () => {
      unifiedDb
        .table('users')
        .where('name', 'John Doe')
        .update({ status: 'inactive' });

      const user = unifiedDb.table('users').where('name', 'John Doe').first();
      assert.strictEqual(user.status, 'inactive');
    });
  });

  describe('DELETE', () => {
    it('should delete records matching WHERE', () => {
      const initialCount = unifiedDb.table('users').count();
      unifiedDb.table('users').where('name', 'Bob Johnson').delete();
      const finalCount = unifiedDb.table('users').count();

      assert.strictEqual(finalCount, initialCount - 1);
    });

    it('should prevent deletion without WHERE', () => {
      assert.throws(
        () => unifiedDb.table('users').delete(),
        /Deleting without WHERE clause is dangerous/
      );
    });
  });

  describe('Fluent Interface', () => {
    it('should chain methods', () => {
      const result = unifiedDb
        .table('users')
        .where('status', 'active')
        .select('name', 'email')
        .orderBy('name')
        .limit(10);

      assert(result instanceof QueryBuilder);
    });
  });

  describe('SQL Generation', () => {
    it('should generate correct SQL', () => {
      const sql = unifiedDb
        .table('users')
        .where('status', 'active')
        .orderBy('name')
        .limit(5)
        .toSql();

      assert(sql.includes('SELECT *'));
      assert(sql.includes('FROM users'));
      assert(sql.includes('WHERE status = ?'));
      assert(sql.includes('ORDER BY name ASC'));
      assert(sql.includes('LIMIT 5'));
    });
  });
});
