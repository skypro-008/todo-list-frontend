ARG NODE_IMAGE=node:19-alpine3.16

FROM ${NODE_IMAGE} as frontend_builder

WORKDIR /code

ADD package.json .
ADD package-lock.json .

RUN npm ci

ADD . .

RUN npm run build

FROM nginx:1.23.3-alpine-slim

COPY --from=frontend_builder /code/dist/ /usr/share/nginx/html
ADD docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 80
