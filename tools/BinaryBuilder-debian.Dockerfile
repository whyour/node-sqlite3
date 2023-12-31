ARG NODE_VERSION=18
ARG VARIANT=bullseye

FROM node:$NODE_VERSION-$VARIANT

WORKDIR /usr/src/build

COPY . .
RUN npm install --ignore-scripts

ENV CFLAGS="${CFLAGS:-} -include ../src/gcc-preinclude.h"
ENV CXXFLAGS="${CXXFLAGS:-} -include ../src/gcc-preinclude.h"
RUN npm run prebuild
RUN ls -lah prebuilds

RUN ldd build/**/node_sqlite3.node; nm build/**/node_sqlite3.node | grep \"GLIBC_\" | c++filt || true

RUN npm run test

CMD ["sh"]
