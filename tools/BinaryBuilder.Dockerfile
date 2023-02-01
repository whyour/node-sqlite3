ARG NODE_VERSION=16
ARG VARIANT=bullseye
ARG TARGET

FROM python:3.10-alpine

RUN apk add make g++ nodejs npm

WORKDIR /usr/src/build

COPY . .

RUN npm install npm@8.6.x -g

RUN npm install -g node-gyp@8.4.x

RUN npm install @mapbox/node-pre-gyp@1.0.9 -g

RUN npm install --ignore-scripts

ENV CFLAGS="${CFLAGS:-} -include ../src/gcc-preinclude.h"
ENV CXXFLAGS="${CXXFLAGS:-} -include ../src/gcc-preinclude.h"

RUN node-pre-gyp configure --target_arch="$TARGET"
RUN node-pre-gyp build --target_arch="$TARGET"

RUN node-pre-gyp package --target_arch="$TARGET"

CMD ["sh"]
