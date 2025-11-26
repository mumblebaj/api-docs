# Hyper-Advanced — API Observability & Traceability

Modern APIs must include:
- metric tracing
- correlation IDs
- distributed tracing
- structured logs

---

## 📘 Correlation ID Header

```yaml
components:
  parameters:
    CorrelationId:
      name: X-Correlation-ID
      in: header
      required: false
      schema:
        type: string
```

---

## 🧩 Response Example

```yaml
headers:
  X-Correlation-ID:
    schema:
      type: string
```

---

## 🧪 Challenge

Update all endpoints to return a correlation ID.

---