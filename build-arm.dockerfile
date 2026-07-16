FROM node:22-slim AS build
WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

ENV CFLAGS="-include ../src/gcc-preinclude.h"
ENV CXXFLAGS="-include ../src/gcc-preinclude.h"

RUN npm ci --ignore-scripts
RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp install --build-from-source
RUN npm run test
RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp package

FROM scratch AS release
WORKDIR /app/build
COPY --from=build /app/build /app/build
