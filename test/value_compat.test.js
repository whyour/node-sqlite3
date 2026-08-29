/* global BigInt */
var assert = require('assert');
var sqlite3 = require('..');

describe('value compatibility', function() {
    var db;

    beforeEach(function(done) {
        db = new sqlite3.Database(':memory:');
        db.exec('CREATE TABLE values_test (value)', done);
    });

    afterEach(function(done) {
        db.close(done);
    });

    it('binds every safe integer as a SQLite INTEGER', function(done) {
        var values = [2147483647, 2147483648, -2147483649, Number.MAX_SAFE_INTEGER];
        var stmt = db.prepare('INSERT INTO values_test VALUES (?)');
        values.forEach(function(value) { stmt.run(value); });
        stmt.finalize(function(err) {
            assert.ifError(err);
            db.all('SELECT value, typeof(value) AS storage FROM values_test', function(selectErr, rows) {
                assert.ifError(selectErr);
                assert.deepStrictEqual(rows.map(function(row) { return row.storage; }),
                    ['integer', 'integer', 'integer', 'integer']);
                assert.deepStrictEqual(rows.map(function(row) { return row.value; }), values);
                done();
            });
        });
    });

    it('binds signed 64-bit BigInt values without precision loss', function(done) {
        var values = [
            BigInt('9007199254740993'),
            BigInt('-9223372036854775808'),
            BigInt('9223372036854775807')
        ];
        var stmt = db.prepare('INSERT INTO values_test VALUES (?)');
        values.forEach(function(value) { stmt.run(value); });
        stmt.finalize(function(err) {
            assert.ifError(err);
            db.configure('integerMode', 'bigint');
            db.all('SELECT value FROM values_test', function(selectErr, rows) {
                assert.ifError(selectErr);
                assert.deepStrictEqual(rows.map(function(row) { return row.value; }), values);
                done();
            });
        });
    });

    it('returns only unsafe integers as BigInt in safe mode', function(done) {
        db.exec([
            'INSERT INTO values_test VALUES (42);',
            'INSERT INTO values_test VALUES (9007199254740993);'
        ].join('\n'), function(err) {
            assert.ifError(err);
            db.configure('integerMode', 'safe');
            db.all('SELECT value FROM values_test', function(selectErr, rows) {
                assert.ifError(selectErr);
                assert.strictEqual(rows[0].value, 42);
                assert.strictEqual(rows[1].value, BigInt('9007199254740993'));
                done();
            });
        });
    });

    it('returns an unsafe lastID without precision loss in safe mode', function(done) {
        var id = BigInt('9007199254740993');
        db.configure('integerMode', 'safe');
        db.run('CREATE TABLE ids (id INTEGER PRIMARY KEY)', function(err) {
            assert.ifError(err);
            db.run('INSERT INTO ids (id) VALUES (?)', id, function(insertErr) {
                assert.ifError(insertErr);
                assert.strictEqual(this.lastID, id);
                done();
            });
        });
    });

    it('rejects BigInt values outside SQLite signed 64-bit range', function() {
        assert.throws(function() {
            db.run('INSERT INTO values_test VALUES (?)', BigInt('9223372036854775808'));
        }, /outside SQLite's signed 64-bit integer range/);
    });

    it('binds Date values as ISO text', function(done) {
        var date = new Date('2026-08-29T00:00:00.123Z');
        db.run('INSERT INTO values_test VALUES (?)', date, function(err) {
            assert.ifError(err);
            db.get('SELECT value, typeof(value) AS storage FROM values_test', function(selectErr, row) {
                assert.ifError(selectErr);
                assert.strictEqual(row.value, date.toISOString());
                assert.strictEqual(row.storage, 'text');
                done();
            });
        });
    });

    it('round-trips an empty BLOB as an empty Buffer', function(done) {
        db.run('INSERT INTO values_test VALUES (?)', Buffer.alloc(0), function(err) {
            assert.ifError(err);
            db.get('SELECT value, typeof(value) AS storage FROM values_test', function(selectErr, row) {
                assert.ifError(selectErr);
                assert(Buffer.isBuffer(row.value));
                assert.strictEqual(row.value.length, 0);
                assert.strictEqual(row.storage, 'blob');
                done();
            });
        });
    });

    it('rejects unknown integer modes', function() {
        assert.throws(function() {
            db.configure('integerMode', 'automatic');
        }, /integerMode must be number, safe, or bigint/);
    });
});
