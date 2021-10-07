# Fork of node-sqlite3

Mainly used for my another project - Uptime Kuma

- SQLite update to 3.36.0
- ARM pre-built
- Fix npm security problem

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
