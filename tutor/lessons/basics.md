# YAML Basics

YAML is a human-friendly format designed for readability and clarity.  
Here are the foundational concepts every YAML author should know:

## 📌 Core Concepts

- **Indentation defines structure** — YAML uses *spaces only*, never tabs. Some editors like Swagger may be converting these tabs to spaces. Be sure to use spaces when you design!
- **Lists use dashes (`-`)**  
  Example:  
  ```yaml
  pets:
    - cat
    - dog
```

- Key-value pairs form maps (objects)

Example:

```yaml
person:
  name: Bernard
  city: Cape Town
```

---

## 🧠 Why It Matters
Understanding indentation and structure early on, helps prevent errors, especially when working with complex OpenAPI documents later.

---

