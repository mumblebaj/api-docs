# Ultra-Advanced OpenAPI — Links

Links connect a **response** to a **future request**.  
This models workflows such as:
- get → update → verify
- create → check status
- login → refresh token

---

## 📦 Example: Order Workflow

```yaml
paths:
  /orders:
    post:
      summary: Create an order
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                properties:
                  id: { type: string }
        links:
          GetOrderStatus:
            operationId: getOrder
            parameters:
              id: '$response.body#/id'
```

---

## 🧠 Why Links Matter

- Documents workflows cleanly
- Helps SDK generators
- Encourages predictable API navigation

---

## 🧪 Challenge

Add a link from:

- OST `/transactions`
→ to
- GET `/transactions/{id}`

---