# Ultra-Advanced — GitHub Actions YAML

GitHub Actions uses YAML to define CI/CD workflows.

---

## 📘 Workflow Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v4
```

---

## 🔌 Matrix Builds

```yaml
strategy:
  matrix:
    node: [16, 18, 20]
```

---

## 🧪 Challenge
Create a workflow that:
- Runs tests on push
- Builds Docker image
- Pushes to registry

---