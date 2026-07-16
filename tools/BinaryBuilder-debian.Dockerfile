ARG NODE_VERSION=24
ARG VARIANT=slim
FROM node:${NODE_VERSION}-${VARIANT}
ARG TARGET
ARG NODE_GYP_VERSION=12

RUN apt update && apt install -y python3 build-essential

WORKDIR /usr/src/build

COPY . .

RUN npm ci --ignore-scripts && \
    npm install --no-save --package-lock=false "node-gyp@${NODE_GYP_VERSION}"

ENV CFLAGS="-include ../src/gcc-preinclude.h"
ENV CXXFLAGS="-include ../src/gcc-preinclude.h"

RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp install --build-from-source --target_arch="$TARGET"

RUN node node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp package --target_arch="$TARGET"

CMD ["sh"]
