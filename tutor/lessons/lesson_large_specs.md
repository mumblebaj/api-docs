# Advanced OpenAPI — Large Specification Best Practices

Large APIs must remain readable, scalable, and modular.

---

## 📁 Split Into Multiple Files

```yaml
# openapi.yaml
paths:
  /users:      $ref: ./paths/users.yaml
  /payments:   $ref: ./paths/payments.yaml

components:
  schemas:     $ref: ./schemas/index.yaml
```

---

## 🧱 Consistent Naming

- Schema names: PascalCase
- Paths: kebab-case
- Properties: camelCase

---

## 🧪 Exercise

Break a CRUD API into:
- `/paths/`
- `/schemas/`
- `/requestBodies/`

---