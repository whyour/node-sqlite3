# Fork of node-sqlite3 with many pre-built supports

Mainly used for my another project - [Uptime Kuma](https://github.com/louislam/uptime-kuma)

## (2022-05-01) Update

The official build supports arm pre-built now, but it is not supported CentOS 7, so I keep using my own build.

- Support CentOS 7 (As of 5.0.6, official one do not support it)


## Outdated Description

Although the upstream node-sqlite3 got updated, but there is still no arm pre-built. So this fork is still needed.

- Support armv7 / arm64 pre-built
- Support Alpine (musl) pre-built
- Support Windows pre-built
- Support MacOS pre-built
- Fix worker_threads problem

PS: No electron supports</del>

## How to use

```
npm install @louislam/sqlite3
npm remove sqlite3
```

Replace require("@louislam/sqlite") in your source code

## Prepare Prebuilt

### glibc & musl

```bash
npm run build-binaries
```

All files in ./build after built.

glibc
- armv7 - npm run build-linux-arm (Support glibc >=2.18 only)
- amd64/arm64 - npm run build-linux

musl (alpine)
- armv7/arm64/amd64 - npm run build-linux-alpine

### Windows / MacOS
- Get from Github Action
