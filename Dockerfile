FROM node:24-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN corepack enable
RUN yarn install

FROM node:24-alpine AS production-dependencies-env
COPY ./package.json yarn.lock /app/
WORKDIR /app
RUN corepack enable
RUN yarn install --production

FROM node:24-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN corepack enable
RUN yarn run build

FROM node:24-alpine
COPY ./package.json yarn.lock /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
RUN corepack enable
CMD ["yarn", "start"]