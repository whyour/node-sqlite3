# Fork of node-sqlite3 with many pre-built supports

Mainly used for my another project - [Uptime Kuma](https://github.com/louislam/uptime-kuma)

## (2022-10-15) Update

The official build supports arm pre-built now, but it is not supported CentOS 7, so I keep using my own build.

- Support CentOS 7 (As of 5.1.2, official one do not support it)


PS: No electron supports

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

### Mac ARM64 (M1/M2)
- Get from TryGhost/node-sqlite3
- Rename to `napi-v6-darwin-arm64-unknown.tar.gz`
- Use 7zip to rename the folder inside to `napi-v6-darwin-arm64`
