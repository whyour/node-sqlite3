FROM python:3.11-alpine
ARG TARGET

RUN apk add --no-cache make g++ nodejs npm

WORKDIR /usr/src/build

COPY . .

RUN npm ci --ignore-scripts

ENV CFLAGS="-include ../src/gcc-preinclude.h -DSQLITE_MUSL_LEGACY_IO=1"
ENV CXXFLAGS="-include ../src/gcc-preinclude.h"

RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp install --build-from-source --target_arch="$TARGET"

RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp package --target_arch="$TARGET"

CMD ["sh"]
