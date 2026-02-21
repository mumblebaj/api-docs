# Advanced YAML — Multi-Document Files

YAML supports multiple independent documents in a single file.

---

## 📘 Basic Syntax

```yaml
---
openapi: 3.0.3
info:
  title: API 1

---
openapi: 3.0.3
info:
  title: API 2

```

---

## 💡 Real Use Case

Kubernetes applies multiple resources from a single `.yaml` file:

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: demo

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
```

---

## 🧪 Try It

Write two OpenAPI fragments in a single file using `---` separators.