# DON'T UPDATE TO node:14-bullseye-slim, see #372.
FROM node:14-alpine3.12 AS build
WORKDIR /app

COPY . .

# split the sqlite install here, so that it can caches the arm prebuilt
# do not modify it, since we don't want to re-compile the arm prebuilt again
RUN apk add make g++ python3 && \
    ln -s /usr/bin/python3 /usr/bin/python

RUN npm install npm@8.6.x -g
RUN npm install -g node-gyp@7.1.2
RUN npm install @mapbox/node-pre-gyp@1.0.9 -g
RUN npm install --ignore-scripts
RUN npx node-pre-gyp install --build-from-source
RUN npm run test
RUN npx node-pre-gyp package

FROM node:14-alpine3.12 AS release
WORKDIR /app/build
# Copy app files from build layer
COPY --from=build /app/build /app/build

