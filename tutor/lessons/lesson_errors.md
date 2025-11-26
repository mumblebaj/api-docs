# Advanced API Design — Error Structures

A consistent error model makes debugging easier.

---

## ⚠ Standard Error Pattern

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required: [code, message]
      properties:
        code: { type: string }
        message: { type: string }
        details:
          type: array
          items:
            type: string
```

---

## 🧪 Example Response

```yaml
responses:
  '400':
    description: Bad request
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
```

---

## 🧪 Exercise

Add a `traceId` field and reuse ErrorResponse across 3 endpoints.

---