# Advanced OpenAPI — Security Schemes

OpenAPI supports:
- API Keys
- OAuth2
- HTTP Basic
- Bearer Tokens

---

## 🔐 OAuth2 Example

```yaml
components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes:
            read: Read access
            write: Write access
```

---

## 📌 Apply Security to an Endpoint

```yaml
security:
  - OAuth2:
      - read
```

---

## 🧪 Task

Add OAuth2 to `/payments` requiring `write` scope.

---
