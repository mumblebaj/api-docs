# Hyper-Advanced — Runtime Validation

Even with OpenAPI, you must validate payloads in production.

Tools:
- AJV (JSON Schema)
- express-openapi-validator
- fastify-openapi-glue
- openapi-backend

---

## 🔧 Runtime Schema Validation Example

```yaml
components:
  schemas:
    PaymentRequest:
      type: object
      required: [amount, currency]
      properties:
        amount:
          type: number
        currency:
          type: string
          minLength: 3
          maxLength: 3
```
Server code:

```js
import Ajv from "ajv";
const ajv = new Ajv();
const validate = ajv.compile(openapi.schemas.PaymentRequest);

if (!validate(req.body)) {
  return res.status(400).json(validate.errors);
}
```

---

## 🧪 Challenge
Add a validator for:
- arrays of transactions
- with strict `additionalProperties: false`