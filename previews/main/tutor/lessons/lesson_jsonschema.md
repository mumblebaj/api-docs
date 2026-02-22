# Ultra-Advanced — JSON Schema Theory

OpenAPI schemas are built on **JSON Schema**.

Understanding it unlocks:
- Custom validation
- Precise API contracts
- Complex constraints

---

## 📘 Deep Numeric Validation

```yaml
amount:
  type: number
  minimum: 0
  maximum: 10000
  multipleOf: 0.01
```

---

## 📘 Pattern Matching

```yaml
iban:
  type: string
  pattern: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$'
```

---

## 📘 Structural Constraints

```yaml
person:
  type: object
  additionalProperties: false
```

---

## 🧪 Challenge

Validate:
- Decimal with 2 fraction digits
- Length between 3–8
- Matches regex

---