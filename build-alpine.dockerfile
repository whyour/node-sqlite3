# DON'T UPDATE TO node:14-bullseye-slim, see #372.
FROM python:3.11-alpine AS build
WORKDIR /app

COPY . .

# Avoid musl pwrite() selecting pwritev2 on old-host seccomp profiles.
ENV CFLAGS="-DSQLITE_MUSL_LEGACY_IO=1"

# split the sqlite install here, so that it can caches the arm prebuilt
# do not modify it, since we don't want to re-compile the arm prebuilt again
RUN apk add --no-cache make g++ nodejs npm && \
    ln -s /usr/bin/python3 /usr/bin/python

RUN npm ci --ignore-scripts
RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp install --build-from-source
RUN npm run test
RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp package

CMD ["sh"]
