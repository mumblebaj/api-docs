# Hyper-Advanced — Contract Testing

Contract testing ensures that:
- Producers do not break consumers
- Consumers do not rely on invalid assumptions
- API evolution remains safe

Tools:
- PACT
- Schemathesis
- Dredd

---

## 📘 1. Provider Contract Testing Example

```yaml
contract:
  consumer: checkout-service
  provider: payments-api
  version: 1.0
```
Provider must satisfy the contract file.

---

## 🔍 2. JSON Schema Contract Testing

```yaml
amount:
  type: number
  minimum: 1
  multipleOf: 0.01
```
Schemathesis validates:
- Random payload fuzzing
- Boundary values
- Negative tests

---

## 🧪 Challenge
Write a schema that enforces:
- ISO currency code (3 letters)
- decimal amount w/ 2 fraction digits
- positive value

---
