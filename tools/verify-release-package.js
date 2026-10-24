'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const [asset, version] = process.argv.slice(2);
if (!asset || !version) {
    throw new Error('Usage: node verify-release-package.js <asset> <version>');
}

const packageRoot = path.dirname(require.resolve('@whyour/sqlite3/package.json', {
    paths: [process.cwd()]
}));
const metadata = require(path.join(packageRoot, 'package.json'));
assert.strictEqual(metadata.version, version);
assert.ok(asset.startsWith('napi-v6-' + process.platform + '-' + process.arch + '-'),
    'asset does not match the runtime platform and architecture: ' + asset);

if (asset.includes('-musl-armv6')) {
    assert.ok(fs.existsSync('/lib/ld-musl-armhf.so.1'), 'not running on Alpine armhf');
} else if (asset.includes('-musl-armv7')) {
    assert.ok(fs.existsSync('/lib/ld-musl-armv7.so.1'), 'not running on Alpine armv7');
}

const binary = path.join(packageRoot, 'lib', 'binding',
    'napi-v6-' + process.platform + '-' + process.arch, 'node_sqlite3.node');
assert.ok(fs.existsSync(binary), 'prebuilt binary was not installed: ' + binary);

function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function releaseBinary() {
    const url = 'https://github.com/whyour/node-sqlite3/releases/download/v' +
        version + '/' + asset;
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    assert.ok(response.ok, 'release download failed: HTTP ' + response.status);
    const archive = zlib.gunzipSync(Buffer.from(await response.arrayBuffer()));
    const tar = require(require.resolve('tar', { paths: [packageRoot] }));
    return new Promise(function(resolve, reject) {
        const binaries = [];
        const parser = new tar.Parse();
        parser.on('entry', function(entry) {
            if (!entry.path.endsWith('/node_sqlite3.node')) {
                entry.resume();
                return;
            }
            const chunks = [];
            entry.on('data', chunk => chunks.push(chunk));
            entry.on('end', () => binaries.push(Buffer.concat(chunks)));
        });
        parser.on('error', reject);
        parser.on('end', function() {
            if (binaries.length !== 1) {
                reject(new Error('expected one binary in ' + asset +
                    ', found ' + binaries.length));
            } else {
                resolve(binaries[0]);
            }
        });
        parser.end(archive);
    });
}

async function smokeTest() {
    const sqlite3 = require(packageRoot);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite3-release-'));
    const filename = path.join(directory, 'smoke.db');
    let db;
    try {
        db = await new Promise(function(resolve, reject) {
            const database = new sqlite3.Database(filename, function(error) {
                if (error) reject(error);
                else resolve(database);
            });
        });
        const run = (sql, params) => new Promise((resolve, reject) => {
            db.run(sql, params || [], error => error ? reject(error) : resolve());
        });
        const get = sql => new Promise((resolve, reject) => {
            db.get(sql, (error, row) => error ? reject(error) : resolve(row));
        });
        await run('PRAGMA journal_mode=WAL');
        await run('CREATE TABLE smoke (value INTEGER NOT NULL)');
        await run('INSERT INTO smoke VALUES (?)', [42]);
        assert.strictEqual((await get('SELECT value FROM smoke')).value, 42);
        assert.strictEqual((await get('PRAGMA integrity_check')).integrity_check, 'ok');
    } finally {
        if (db) {
            await new Promise((resolve, reject) => db.close(error =>
                error ? reject(error) : resolve()));
        }
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

(async function() {
    const expected = hash(await releaseBinary());
    const actual = hash(fs.readFileSync(binary));
    assert.strictEqual(actual, expected,
        'installed binary differs from the GitHub release asset ' + asset);
    await smokeTest();
    console.log('PASS ' + asset + ' on ' + process.platform + '/' + process.arch +
        ' (' + process.version + '), sha256=' + actual);
})().catch(function(error) {
    console.error(error);
    process.exitCode = 1;
});
