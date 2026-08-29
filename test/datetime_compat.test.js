var assert = require('assert');
var sqlite3 = require('..');

describe('DATETIME compatibility', function() {
    var db;

    beforeEach(function(done) {
        db = new sqlite3.Database(':memory:');
        db.exec([
            'CREATE TABLE events (',
            '  happened_at DATETIME,',
            '  precise_at DATETIME(6),',
            '  count INTEGER',
            ');'
        ].join('\n'), done);
    });

    afterEach(function(done) {
        db.close(done);
    });

    it('preserves SQLite numeric date formats by default', function(done) {
        var milliseconds = 1690000000000;
        var unixSeconds = 1690000000;
        var julianDay = 2460000.5;
        db.run(
            'INSERT INTO events (happened_at, precise_at, count) VALUES (?, ?, ?)',
            unixSeconds,
            julianDay,
            milliseconds,
            function(err) {
                assert.ifError(err);
                db.get('SELECT * FROM events', function(selectErr, row) {
                    assert.ifError(selectErr);
                    assert.strictEqual(row.happened_at, unixSeconds);
                    assert.strictEqual(row.precise_at, julianDay);
                    assert.strictEqual(row.count, milliseconds);
                    done();
                });
            }
        );
    });

    it('converts declared numeric DATETIME columns only when explicitly enabled', function(done) {
        var milliseconds = 1690000000000;
        db.configure('dateMode', 'iso-milliseconds');
        db.run(
            'INSERT INTO events (happened_at, precise_at, count) VALUES (?, ?, ?)',
            milliseconds,
            milliseconds + 0.5,
            milliseconds,
            function(err) {
                assert.ifError(err);
                db.get('SELECT * FROM events', function(selectErr, row) {
                    assert.ifError(selectErr);
                    assert.strictEqual(row.happened_at, new Date(milliseconds).toISOString());
                    assert.strictEqual(row.precise_at, new Date(milliseconds + 0.5).toISOString());
                    assert.strictEqual(row.count, milliseconds);
                    done();
                });
            }
        );
    });

    it('does not guess the type of expressions without declared metadata', function(done) {
        var milliseconds = 1690000000000;
        db.configure('dateMode', 'iso-milliseconds');
        db.run('INSERT INTO events (happened_at) VALUES (?)', milliseconds, function(err) {
            assert.ifError(err);
            db.get('SELECT max(happened_at) AS happened_at FROM events', function(selectErr, row) {
                assert.ifError(selectErr);
                assert.strictEqual(row.happened_at, milliseconds);
                done();
            });
        });
    });

    it('keeps text and out-of-range DATETIME values unchanged', function(done) {
        var iso = '2026-08-29T00:00:00.000Z';
        var outOfRange = 8640000000000001;
        db.configure('dateMode', 'iso-milliseconds');
        db.run(
            'INSERT INTO events (happened_at, precise_at) VALUES (?, ?)',
            iso,
            outOfRange,
            function(err) {
                assert.ifError(err);
                db.get('SELECT * FROM events', function(selectErr, row) {
                    assert.ifError(selectErr);
                    assert.strictEqual(row.happened_at, iso);
                    assert.strictEqual(row.precise_at, outOfRange);
                    done();
                });
            }
        );
    });

    it('keeps PRAGMA declared types as strings for ORM schema parsing', function(done) {
        db.all('PRAGMA table_info(events)', function(err, rows) {
            assert.ifError(err);
            rows.forEach(function(row) {
                assert.strictEqual(typeof row.type, 'string');
            });
            done();
        });
    });

    it('rejects unknown date modes', function() {
        assert.throws(function() {
            db.configure('dateMode', 'automatic');
        }, /dateMode must be raw or iso-milliseconds/);
    });
});
