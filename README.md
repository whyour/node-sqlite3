# node-sqlite3

Mainly used for my another project - [Qinglong](https://github.com/whyour/qinglong)

## What is the different between TryGhost/node-sqlite3?

The following architecture is supported:

1. Alpine (required): linux/amd64, linux/arm/v7,
   linux/arm64, linux/ppc64le, linux/s390x, linux/386
2. Debian (required): linux/amd64, linux/arm/v7, linux/arm64,
   linux/ppc64le, linux/s390x
3. Desktop (best effort): macOS arm64/x64 and Windows x64

## How to use

```
{
  "sqlite3": "git+https://github.com/whyour/node-sqlite3.git",
}
```

## Documentation

https://github.com/TryGhost/node-sqlite3

## Value conversion modes

SQLite does not have a dedicated date storage class. Numeric `DATETIME`
columns therefore stay numeric by default, preserving Unix seconds, Julian
days, and application-specific values. Applications whose legacy schema uses
JavaScript epoch milliseconds can opt in before reading rows:

```js
db.configure('dateMode', 'iso-milliseconds');
```

The conversion applies only to direct result columns for which SQLite exposes
a `DATETIME` declaration. Expressions such as `max(created_at)` have no
declared type metadata and remain unchanged.

SQLite integers are returned as JavaScript numbers by default for compatibility.
Use `safe` to return only integers outside JavaScript's safe range as `bigint`,
or `bigint` to return every SQLite integer as `bigint`:

```js
db.configure('integerMode', 'safe');
db.configure('integerMode', 'bigint');
```

JavaScript `bigint` parameters are accepted across the full signed 64-bit
SQLite range. JavaScript `Date` parameters are stored as ISO-8601 text.

## Alpine legacy-host compatibility

Alpine prebuilds define `SQLITE_MUSL_LEGACY_IO=1`. ARM packages target ARMv7;
ARMv6 and ARMv7 cannot be distinguished by the generic Node.js `arm` package
name, so publishing both would silently overwrite one architecture. ARMv6 is
not supported by the prebuilt package and must explicitly build from source. The
bundled SQLite Unix
VFS then uses its existing `lseek` plus `read`/`write` fallback instead of
musl's `pread`/`pwrite` wrappers. This keeps the module usable when an older
host seccomp profile rejects `pwritev2` with `EPERM`.

Linux builds that use the bundled SQLite are linked with `-Bsymbolic`. This is
required on Node.js builds that already load a system `libsqlite3` (including
Alpine Node.js 24), so the addon's SQLite calls cannot be interposed by that
system library. External SQLite builds are unchanged.

## Prebuild toolchains

Published binaries keep the `napi-v6` ABI; the Node.js version used to compile
them does not become a runtime requirement. Release CI uses Node.js 24 where an
official image exists and Node.js 22 with node-gyp 12 for glibc ARMv7. Alpine
builds use the Node.js package from the floating
`python:3.11-alpine` image and currently require Node.js 24. Desktop prebuilds
are best-effort and do not block the Qinglong Linux release matrix. The glibc
s390x prebuild uses Node.js 20 with node-gyp 12. This keeps the Bookworm glibc
baseline: Node.js 22 has no official s390x slim image, while Node.js 24
provides s390x only with the newer Trixie variant.
