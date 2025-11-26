# Advanced OpenAPI — Understanding Parameters

Parameters allow you to pass inputs into your API:
- path parameters
- query parameters
- headers
- cookies

---

## 🔗 Path Parameters

```yaml
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
```

---

## 🔎 Query Parameters

```yaml
parameters:
  - name: limit
    in: query
    required: false
    schema:
      type: integer
      default: 100
```

---

## 🧪 Exercise

Add `sort` and `filter` parameters to a `/items` endpoint.

---
