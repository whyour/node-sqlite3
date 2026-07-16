var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

describe('SQLite musl legacy I/O patch', function() {
    var outputDir;
    var sqliteSource;

    before(function() {
        outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite3-musl-legacy-io-'));
        childProcess.execFileSync(process.execPath, [
            path.resolve('deps/extract.js'),
            path.resolve('deps/sqlite-autoconf-3410100.tar.gz'),
            outputDir
        ]);
        sqliteSource = fs.readFileSync(
            path.join(outputDir, 'sqlite-autoconf-3410100', 'sqlite3.c'),
            'utf8'
        );
    });

    after(function() {
        fs.rmSync(outputDir, { recursive: true, force: true });
    });

    it('disables positional I/O only behind the opt-in build macro', function() {
        var guard = [
            '#ifdef SQLITE_MUSL_LEGACY_IO',
            '# undef HAVE_PREAD',
            '# undef HAVE_PWRITE',
            '# undef HAVE_PREAD64',
            '# undef HAVE_PWRITE64',
            '# undef USE_PREAD',
            '# undef USE_PREAD64',
            '#endif'
        ].join('\n');
        var selection = '/* Use pread() and pwrite() if they are available */';

        assert.notEqual(sqliteSource.indexOf(guard), -1);
        assert(sqliteSource.indexOf(guard) < sqliteSource.indexOf(selection));
    });

    it('retains SQLite lseek plus read/write fallback branches', function() {
        assert(sqliteSource.includes('newOffset = lseek(id->h, offset, SEEK_SET);'));
        assert(sqliteSource.includes('i64 iSeek = lseek(fd, iOff, SEEK_SET);'));
        assert(sqliteSource.includes('rc = osWrite(fd, pBuf, nBuf);'));
    });

    it('binds the bundled SQLite locally on Linux', function() {
        var binding = fs.readFileSync(path.resolve('binding.gyp'), 'utf8');
        assert(binding.includes('"-Wl,-Bsymbolic"'));
    });

    it('enables legacy I/O only in Alpine builders', function() {
        var alpine = fs.readFileSync(
            path.resolve('tools/BinaryBuilder-alpine.Dockerfile'),
            'utf8'
        );
        var debian = fs.readFileSync(
            path.resolve('tools/BinaryBuilder-debian.Dockerfile'),
            'utf8'
        );

        assert(alpine.includes('-DSQLITE_MUSL_LEGACY_IO=1'));
        assert(!debian.includes('SQLITE_MUSL_LEGACY_IO'));
    });

    it('keeps positional I/O enabled for regular Linux builds', function() {
        var sqliteGyp = fs.readFileSync(path.resolve('deps/sqlite3.gyp'), 'utf8');

        assert(sqliteGyp.includes("'HAVE_PREAD=1'"));
        assert(sqliteGyp.includes("'HAVE_PWRITE=1'"));
    });
});
