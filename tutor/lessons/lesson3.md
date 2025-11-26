# Lesson 3 — Required Fields in OpenAPI Schemas

OpenAPI schema objects often include *required fields* that clients must provide.  
Teaching new YAML authors how `required:` works is essential.

---

## 🎯 Learning Goal

Understand how `required:` works inside OpenAPI component schemas, how it relates to object properties, and how to avoid common mistakes.

---

## 🧱 Example 1 — Missing `required:` Block

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
```

---

> 📝 Teaching Tip: This schema defines fields but doesn’t specify which ones are required.
New authors often assume `type: string` implies `required` — but it does not.

---

## ✅ Example 2 — Correct required: Section

```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
        email:
          type: string
```
Now consumers understand what must be included, and automated generators enforce it.

### ⚠ Common Pitfall — `required:` doesn’t match properties
```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - missingField     # ❌ this does not exist
      properties:
        id:
          type: string
        email:
          type: string
```

> 📝 Teaching Tip: Every required: entry must correspond to a property defined under properties:.

---

## 🎉 Summary

- Use `required:` inside schemas to define mandatory fields.
- Ensure all entries in `required:` exist as properties.
- Missing or mismatched `required:` entries cause validation issues and confuse API consumers.

---
