# Advanced YAML — Anchors & Aliases

Anchors (`&`) and aliases (`*`) allow you to **reuse YAML blocks** without duplication.

---

## 📌 Basic Example

```yaml
defaults: &common
  retries: 3
  timeout: 1000

serviceA:
  <<: *common
  url: https://api.example.com/a

serviceB:
  <<: *common
  url: https://api.example.com/b
```

---

## 🧩 Reusing Object Structures

```yaml
credentials: &creds
  username: admin
  password: secret123

database:
  auth: *creds

cache:
  auth: *creds
```

---

## 🔄 Merge Keys

```yaml
base: &base
  type: object
  required: [id]

user:
  <<: *base
  properties:
    id: { type: string }
    name: { type: string }
```

---

## 🧪 Try It

Create a shared schema with anchors and reuse it across multiple endpoints.

---
