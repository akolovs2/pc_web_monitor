FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
COPY .env . 
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
ARG PORT=5000
ENV PORT=${PORT}
RUN npm install -g serve --silent
COPY --from=build /app/dist /app/dist
EXPOSE ${PORT}
CMD ["sh", "-c", "serve -s dist -l $PORT"]