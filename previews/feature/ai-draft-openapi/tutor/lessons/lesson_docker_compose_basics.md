# DevOps YAML — Docker Compose Deep Dive

Docker Compose uses YAML to orchestrate multiple containers
into a single environment. It is commonly used in:
- microservices development
- local stacks
- staging environments
- CI pipelines
- testing and sandbox systems

This lesson covers how to build clean, production-quality
Compose files using modern Compose v3+ syntax.

---

## 🧱 Basic Compose Structure

```yaml
services:
  app:
    image: node:18
    ports:
      - "3000:3000"
```

Main sections:
- `services` — your containers
- `volumes` — shared storage
- `networks` — isolated networks
- `configs` / `secrets` — advanced Docker Swarm objects

---

## 📘 Multi-Service Example

```yaml
services:
  api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      DB_HOST: db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

This demonstrates:
- service-to-service networking (`api` → `db`)
- named volumes
- build context vs image

---

## 📦 Environment Variables and .env Files

Docker Compose automatically loads `.env` file values.

```yaml
services:
  app:
    image: myapp:latest
    environment:
      APP_ENV: ${APP_ENV}
      API_KEY: ${API_KEY}
```
`.env` example:

```yaml
APP_ENV=production
API_KEY=123456
```

---

## 🧩 Dependency Ordering (`depends_on`)

```yaml
services:
  api:
    build: .
    depends_on:
      - redis

  redis:
    image: redis:7
```
> [! NOTE]
> Note: `depends_on` does NOT wait for services to be "ready" — only "started".

For true readiness, use:
- healthchecks
- retry logic
- wait-for scripts

---

## 🩺 Healthchecks

```yaml
services:
  api:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      retries: 3
```

A healthy status helps Compose stabilize cross-service traffic.

---

## 🐳 Production Features

**Restart Policies**

```yaml
restart: unless-stopped
```

**Named Networks**

```yaml
networks:
  backend:
    driver: bridge

services:
  api:
    networks: [backend]
```

**Secrets**

```yaml
secrets:
  jwt_key:
    file: ./secrets/jwt-key.pem
```

**readonly Filesystems**

```yaml
read_only: true
```

---

## 📦 Full Production-Ready Compose Example

```yaml
services:
  frontend:
    image: nginx:stable
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro
    ports:
      - "80:80"
    depends_on: [api]

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      retries: 5
    restart: always

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: supersecret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 🧠 Best Practices

- Use named volumes for real data
- Always include healthchecks
- Separate dev/prod using:
    - `docker-compose.yml`
    - `docker-compose.prod.yml`
- Never bake secrets inside the YAML
- Avoid `latest` tag for production

---

## 🧪 Challenge

Create a 3-service Compose stack:
- `api` (Node or Python)
- `queue` (RabbitMQ or Redis)
- `worker` (background processor)

Include:
- healthchecks
- named volumes
- networks
- environment variables

Try running it with:

```css
docker compose up --build
```

---