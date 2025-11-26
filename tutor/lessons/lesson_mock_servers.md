# Hyper-Advanced — Mock Servers & Simulation

Mocking is critical for:
- frontend development
- integration testing
- sandbox environments

Tools:
- Prism
- WireMock
- Mockoon
- Stoplight Studio

---

## 📘 Prism Example

```yaml
prism:
  mock:
    dynamic: false
```

Start mock server:

```nginx
prism mock openapi.yaml
```

---

## 🧪 Challenge

Define mock responses for:
- 200
- 400
- 429 (rate limit)

---