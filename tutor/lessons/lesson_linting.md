# Hyper-Advanced — API Linting & Governance

Linting provides **consistent API design across teams**.

Tool: Stoplight Spectral

---

## 📘 Example Custom Ruleset

```yaml
extends: spectral:oas

rules:
 no-http:
   description: Avoid insecure URLs
   given: $.servers[*].url
   then:
     function: pattern
     functionOptions:
       notMatch: ^http://

 require-descriptions:
   description: Every schema must have a description
   given: $.components.schemas[*]
   then:
     field: description
     function: truthy
```

---

## 🧪 Challenge

Create rules for:
- kebab-case path names
- require `operationId`
- forbid duplicate schemas

---