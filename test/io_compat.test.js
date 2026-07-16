var assert = require('assert');
var sqlite3 = require('..');
var helper = require('./support/helper');

describe('database I/O compatibility', function() {
    var filename = 'test/tmp/io_compat.db';

    function openDatabase() {
        return new Promise(function(resolve, reject) {
            var db = new sqlite3.Database(filename, function(err) {
                if (err) return reject(err);
                db.configure('busyTimeout', 30000);
                resolve(db);
            });
        });
    }

    function exec(db, sql) {
        return new Promise(function(resolve, reject) {
            db.exec(sql, function(err) {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    function get(db, sql) {
        return new Promise(function(resolve, reject) {
            db.get(sql, function(err, row) {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    function close(db) {
        return new Promise(function(resolve, reject) {
            db.close(function(err) {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    before(function() {
        helper.ensureExists('test/tmp');
        helper.deleteFile(filename);
        helper.deleteFile(filename + '-shm');
        helper.deleteFile(filename + '-wal');
    });

    after(function() {
        helper.deleteFile(filename);
        helper.deleteFile(filename + '-shm');
        helper.deleteFile(filename + '-wal');
    });

    it('supports WAL, transactions, concurrent connections, and VACUUM', async function() {
        var setup = await openDatabase();
        await exec(setup, [
            'PRAGMA journal_mode=WAL;',
            'CREATE TABLE writes (writer INTEGER NOT NULL, value INTEGER NOT NULL);'
        ].join('\n'));
        await close(setup);

        var writers = await Promise.all([0, 1, 2, 3].map(async function(writer) {
            var db = await openDatabase();
            var statements = ['BEGIN IMMEDIATE;'];
            for (var value = 0; value < 50; value++) {
                statements.push('INSERT INTO writes VALUES (' + writer + ', ' + value + ');');
            }
            statements.push('COMMIT;');
            await exec(db, statements.join('\n'));
            await close(db);
        }));
        assert.equal(writers.length, 4);

        var verify = await openDatabase();
        var count = await get(verify, 'SELECT count(*) AS count FROM writes');
        assert.equal(count.count, 200);
        var integrity = await get(verify, 'PRAGMA integrity_check');
        assert.equal(integrity.integrity_check, 'ok');
        await exec(verify, 'PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
        await close(verify);
    });
});
