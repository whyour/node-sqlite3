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

    it('returns legacy numeric DATETIME values as ISO strings', function(done) {
        var milliseconds = 1690000000000;
        db.run(
            'INSERT INTO events (happened_at, precise_at, count) VALUES (?, ?, ?)',
            milliseconds,
            milliseconds + 0.5,
            milliseconds,
            function(err) {
                assert.ifError(err);
                db.get('SELECT * FROM events', function(selectErr, row) {
                    assert.ifError(selectErr);
                    assert.equal(row.happened_at, new Date(milliseconds).toISOString());
                    assert.equal(row.precise_at, new Date(milliseconds + 0.5).toISOString());
                    assert.equal(row.count, milliseconds);
                    done();
                });
            }
        );
    });

    it('keeps text and out-of-range DATETIME values unchanged', function(done) {
        var iso = '2026-08-29T00:00:00.000Z';
        var outOfRange = 8640000000000001;
        db.run(
            'INSERT INTO events (happened_at, precise_at) VALUES (?, ?)',
            iso,
            outOfRange,
            function(err) {
                assert.ifError(err);
                db.get('SELECT * FROM events', function(selectErr, row) {
                    assert.ifError(selectErr);
                    assert.equal(row.happened_at, iso);
                    assert.equal(row.precise_at, outOfRange);
                    done();
                });
            }
        );
    });

    it('keeps PRAGMA declared types as strings for ORM schema parsing', function(done) {
        db.all('PRAGMA table_info(events)', function(err, rows) {
            assert.ifError(err);
            rows.forEach(function(row) {
                assert.equal(typeof row.type, 'string');
            });
            done();
        });
    });
});
