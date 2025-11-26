# Advanced API Design — Pagination

Large datasets require pagination for performance and usability.

---

## 🔢 Offset Pagination

```yaml
parameters:
  - name: offset
    in: query
    schema: { type: integer, default: 0 }
  - name: limit
    in: query
    schema: { type: integer, default: 20 }
```

---

## 🧩 Cursor Pagination

```yaml
paths:
  /items:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  nextCursor: { type: string }
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Item'
```

---

## 🧪 Task

Design cursor pagination for a `/transactions` endpoint.

---