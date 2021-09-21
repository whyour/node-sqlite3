# DON'T UPDATE TO node:14-bullseye-slim, see #372.
FROM node:14-stretch-slim AS build
WORKDIR /app

COPY . .

# split the sqlite install here, so that it can caches the arm prebuilt
# do not modify it, since we don't want to re-compile the arm prebuilt again
RUN apt update && \
    apt --yes install python3 python3-pip python3-dev git g++ make && \
    ln -s /usr/bin/python3 /usr/bin/python

RUN npm install @mapbox/node-pre-gyp -g
RUN npm install --ignore-scripts
RUN npx node-pre-gyp install --build-from-source
RUN npm run test
RUN npx node-pre-gyp package

FROM node:14-stretch-slim AS release
WORKDIR /app/build
# Copy app files from build layer
COPY --from=build /app/build /app/build

