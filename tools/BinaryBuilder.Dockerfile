ARG NODE_VERSION=16
ARG VARIANT=bullseye
ARG TARGET

FROM python:3.10-alpine

RUN apk add make g++ nodejs npm && \
    ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /usr/src/build

COPY . .
RUN npm install --ignore-scripts

ENV CFLAGS="${CFLAGS:-} -include ../src/gcc-preinclude.h"
ENV CXXFLAGS="${CXXFLAGS:-} -include ../src/gcc-preinclude.h"
# RUN npx node-pre-gyp configure --target_arch="$TARGET"
# RUN npx node-pre-gyp build --target_arch="$TARGET"

# RUN npx node-pre-gyp package --target_arch="$TARGET"
RUN npx node-pre-gyp configure
RUN npx node-pre-gyp build

RUN npx node-pre-gyp package

CMD ["sh"]
