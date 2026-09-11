FROM node:20-alpine AS builder
WORKDIR /web
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app ./
RUN npm run build

FROM nginx:alpine
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /web/dist /usr/share/nginx/html
EXPOSE 80
