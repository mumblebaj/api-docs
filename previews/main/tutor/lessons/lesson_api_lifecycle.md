# Ultra-Advanced — API Lifecycle

APIs follow lifecycle stages:

1. draft  
2. internal  
3. beta  
4. stable  
5. deprecated  
6. retired

---

## 🧪 Indicating Deprecation

```yaml
paths:
  /v1/items:
    get:
      deprecated: true
```

---

## 🧩 Version Promotion Example

```yaml
info:
  version: 2.0.0
```

---

## 🧪 Challenge
Show:
- A deprecated endpoint
- A newly introduced endpoint

---