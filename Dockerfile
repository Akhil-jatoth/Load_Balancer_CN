# Multi-stage Dockerfile for Relay Monorepo

# Stage 1: Build Frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build Backend Application
FROM eclipse-temurin:21-jdk-alpine AS java-builder
WORKDIR /app
COPY gradlew ./
COPY gradle/ ./gradle/
COPY build.gradle settings.gradle ./
COPY core/ ./core/
COPY demo-backends/ ./demo-backends/
COPY api/ ./api/
COPY --from=web-builder /app/web/dist ./web/dist

RUN chmod +x gradlew && ./gradlew :api:installDist --no-daemon

# Stage 3: Runtime Container
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=java-builder /app/api/build/install/api ./
COPY --from=web-builder /app/web/dist ./web/dist

ENV API_PORT=8000
ENV PROXY_PORT=8080

# Expose Proxy (8080), Control-Plane/Dashboard (8000), Demo Backends (9001-9004)
EXPOSE 8000 8080 9001 9002 9003 9004

ENTRYPOINT ["./bin/api"]
