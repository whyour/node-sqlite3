const tar = require("tar");
const fs = require("fs");
const path = require("path");
const tarball = path.resolve(process.argv[2]);
const dirname = path.resolve(process.argv[3]);

const legacyIoGuard = `#ifdef SQLITE_MUSL_LEGACY_IO
# undef HAVE_PREAD
# undef HAVE_PWRITE
# undef HAVE_PREAD64
# undef HAVE_PWRITE64
# undef USE_PREAD
# undef USE_PREAD64
#endif

`;

function patchMuslLegacyIo(source) {
    if (source.includes(legacyIoGuard)) {
        return source;
    }

    const marker = "/* Use pread() and pwrite() if they are available */";
    if (!source.includes(marker)) {
        throw new Error("Unable to locate SQLite Unix VFS pread/pwrite selection");
    }

    return source.replace(marker, legacyIoGuard + marker);
}

tar.extract({
    sync: true,
    file: tarball,
    cwd: dirname,
});

// Keep the bundled tarball pristine and patch the generated amalgamation.
// Alpine prebuilds opt in with SQLITE_MUSL_LEGACY_IO; every other build keeps
// SQLite's normal pread/pwrite path.
const sqliteDir = path.basename(tarball, ".tar.gz");
const sqliteSource = path.join(dirname, sqliteDir, "sqlite3.c");
const source = fs.readFileSync(sqliteSource, "utf8");
fs.writeFileSync(sqliteSource, patchMuslLegacyIo(source));

module.exports = { patchMuslLegacyIo };
