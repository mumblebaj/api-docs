# Ultra-Advanced OpenAPI — Callbacks

Callbacks allow your API to call **the client back** after the initial request.  
Useful for:
- async processing
- webhook flows
- approval systems
- long-running jobs

---

## 🚦 Basic Callback Structure

```yaml
paths:
  /subscribe:
    post:
      summary: Register for notifications
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                callbackUrl:
                  type: string
      responses:
        '201':
          description: Subscribed
      callbacks:
        onMessage:
          '{$request.body#/callbackUrl}':
            post:
              summary: Push event to client
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        message: { type: string }
```

---

## 🔍 Key Points

- Callback URL is dynamic
- `$request.body#/path` injects runtime values
- Callback is a reverse API call
- Useful for event notifications

---

## 🧪 Exercise

Build:
- A `/payments` request
- A `paymentCompleted` callback to notify the merchant

---