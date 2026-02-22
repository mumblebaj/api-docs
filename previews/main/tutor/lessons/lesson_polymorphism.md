# Advanced OpenAPI — Polymorphism

Polymorphism lets schemas behave like inheritance or unions.

---

## 🧱 `oneOf` — Exactly one schema matches

```yaml
components:
  schemas:
    Payment:
      oneOf:
        - $ref: '#/components/schemas/CardPayment'
        - $ref: '#/components/schemas/BankPayment'
```

---

## 🔗 allOf — Combine schemas (like inheritance)

```yaml
components:
  schemas:
    BasePet:
      type: object
      properties:
        name: { type: string }

    Dog:
      allOf:
        - $ref: '#/components/schemas/BasePet'
        - type: object
          properties:
            bark: { type: boolean }
```

---

## 🎛 `anyOf` — Any matching schema is valid

```yaml
components:
  schemas:
    Identifier:
      anyOf:
        - type: string
        - type: integer
```

---

## 🧪 Challenge

Create a Vehicle schema using oneOf for:
- Car
- Motorcycle
- Truck

---