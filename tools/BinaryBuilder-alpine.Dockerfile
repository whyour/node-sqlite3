ARG NODE_VERSION=18
ARG VARIANT=alpine3.18

FROM python:3.11-$VARIANT

RUN apk add build-base nodejs npm --update-cache

WORKDIR /usr/src/build

COPY . .
RUN npm install --ignore-scripts

ENV CFLAGS="${CFLAGS:-} -include ../src/gcc-preinclude.h"
ENV CXXFLAGS="${CXXFLAGS:-} -include ../src/gcc-preinclude.h"
RUN npm run prebuild
RUN ls -lah prebuilds

RUN npm run test

CMD ["sh"]
