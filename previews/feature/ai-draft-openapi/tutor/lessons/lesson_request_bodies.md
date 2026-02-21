# Advanced OpenAPI — Reusable Request Bodies

You can define common request bodies in `components/requestBodies`.

---

## 📦 Example

```yaml
components:
  requestBodies:
    CreateUserBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/User'
```

---

## ✔ Using It In Endpoints

```yaml
paths:
  /users:
    post:
      requestBody:
        $ref: '#/components/requestBodies/CreateUserBody'
```

---

## 🧪 Try It

Create a reusable requestBody for creating `Order` items.

---