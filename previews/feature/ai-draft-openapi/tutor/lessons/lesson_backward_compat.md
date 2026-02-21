# Hyper-Advanced — Backward Compatibility

Before deploying a new version, test that:
- old clients still work
- schemas remain compatible
- removed fields don’t break consumers

---

## 📘 Compatibility Rule

Removing:
- a required field  
- a type  
- a schema reference  

…is a BREAKING change.

---

## 🧩 Example

```yaml
# v1
User:
  required: [id, email]

# v2 → BREAKING
User:
  required: [id]
```

---

## 🧪 Challenge

Identify 3 breaking changes in a schema of your choice.

---