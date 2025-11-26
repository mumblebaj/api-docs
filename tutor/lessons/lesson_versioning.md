# Advanced API Design — Versioning Strategies

Versioning helps maintain backward-compatible APIs.

---

## 📘 URL Versioning

```yaml
paths:
  /v1/items:
    get: { ... }
```

---

## 📬 Header Versioning

```yaml
parameters:
  - name: X-API-Version
    in: header
    schema: { type: string }
```

---

## 🧪 Semantic Versioning Example

```yaml
info:
  version: 1.2.0
```

---

## 🧪 Exercise

Add versioning support to your CRUD API.

---