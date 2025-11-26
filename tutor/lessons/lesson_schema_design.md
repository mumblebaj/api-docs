# Lesson — Designing Quality API Schemas

Good schemas improve the developer experience and reduce bugs.

---

## 🧱 Use Descriptions Everywhere

```yaml
components:
  schemas:
    User:
      type: object
      description: A registered user in the system.
      properties:
        id:
          type: string
          description: Unique identifier.
```

---

## 🎯 Use `enum` to Limit Values

```yaml
components:
  schemas:
    Status:
      type: string
      enum:
        - pending
        - approved
        - rejected
```

---

## 🔐 Use `format` for known types

```yaml
email:
  type: string
  format: email
```

---

## 🧩 Required Fields

```yaml
components:
  schemas:
    Payment:
      type: object
      required:
        - amount
      properties:
        amount:
          type: number
```

---

## 🧪 Challenge

Create a `Transaction` schema using:
- required fields
- enums
- description
- nested object
- proper formatting

---