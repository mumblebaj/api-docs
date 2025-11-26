# Indentation Rules

YAML relies entirely on indentation for hierarchy.  
Incorrect indentation is one of the most common causes of YAML errors.

## 🧱 Golden Rules

- **Never use tabs — only spaces.**
- **Indentation defines object hierarchy**, so every nested level must be indented consistently.
- **List items must be aligned** under the same parent.

### ✔ Correct Example
```yaml
person:
  name: Alice
  pets:
    - cat
    - dog
```

### ❌ Incorrect Example
```yaml
person:
   name: Alice      # mixed indentation
    pets:
      - cat
```

Even a single incorrect space can completely change the meaning of a YAML document.

---
