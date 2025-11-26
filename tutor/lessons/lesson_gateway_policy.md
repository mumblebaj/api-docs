# Hyper-Advanced — API Gateways & YAML Policies

Gateways use YAML for:
- rate limits
- auth policies
- routing rules
- transformations
- caching layers

Applies to:
- Kong
- Apigee
- AWS API Gateway
- Tyk
- ApiSix

---

## 📘 Kong Example

```yaml
routes:
  - name: payments
    paths:
      - /payments
    methods:
      - POST

plugins:
  - name: rate-limiting
    config:
      minute: 60
```

---

## 🧪 Challenge

Write a policy to:
- require OAuth2
- rate-limit 100/min
- add CORS headers

---