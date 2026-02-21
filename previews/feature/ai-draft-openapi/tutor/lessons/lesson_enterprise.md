# Ultra-Advanced — Enterprise OpenAPI Structure

Large enterprises split specs into many files.

---

## 📁 Example Folder Layout

openapi/
├─ openapi.yaml
├─ paths/
│ ├─ payments.yaml
│ ├─ users.yaml
├─ schemas/
│ ├─ User.yaml
│ ├─ Payment.yaml
├─ requestBodies/
│ ├─ CreatePayment.yaml

---

## 📘 Hub File (Root)

```yaml
openapi: 3.1.0
paths:
  /payments:   $ref: ./paths/payments.yaml
  /users:      $ref: ./paths/users.yaml

components:
  schemas:       $ref: ./schemas/
  requestBodies: $ref: ./requestBodies/
```

---

## 🧪 Challenge
Create a folder layout for:
- Auth
- Transactions
- Accounts

---