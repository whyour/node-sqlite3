# Fork of node-sqlite3

Mainly used for my another project - Uptime Kuma

Although the main node-sqlite3 got updated, but there is still no arm pre-built.

- Support armv7 / arm64 pre-built
- Support Alpine (musl) pre-built

PS: No electron supports

## How to use

```
npm install @louislam/sqlite3
npm remove sqlite3
```

Replace require("@louislam/sqlite") in your source code

## Prepare Prebuilt

glibc
- armv7 - npm run build-linux-arm (Support glibc >=2.18 only)
- amd64/arm64 - npm run build-linux

musl (alpine)
- armv7/arm64/amd64 - npm run build-linux-alpine

Windows / MacOS
- Get from Github Action
