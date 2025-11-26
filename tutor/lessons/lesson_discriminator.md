# Ultra-Advanced — Discriminators

A discriminator tells OpenAPI which schema to use when multiple types are valid.

Used in:
- Inheritance
- Polymorphism
- Complex object unions

---

## 📘 Example

```yaml
components:
  schemas:
    Animal:
      type: object
      discriminator:
        propertyName: type
      oneOf:
        - $ref: '#/components/schemas/Cat'
        - $ref: '#/components/schemas/Dog'

    Cat:
      type: object
      properties:
        type: { type: string, enum: [cat] }
        meow: { type: boolean }

    Dog:
      type: object
      properties:
        type: { type: string, enum: [dog] }
        bark: { type: boolean }
```

---

## 🧩 Benefits

- Precise code generation
- More readable APIs
- Validates incoming payloads

---

## 🧪 Challenge

Create:
- Base `Event`
- `UserEvent`
- `SystemEvent`
- A discriminator selecting between them

---