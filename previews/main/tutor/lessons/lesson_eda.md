# Ultra-Advanced — Event-Driven APIs with Callbacks

Combine callbacks + async patterns to document event-based systems.

---

## 📡 Example — Payment Notifications

```yaml
paths:
  /payments:
    post:
      summary: Start payment
      requestBody:
        required: true
      responses:
        '202':
          description: Processing
      callbacks:
        paymentCompleted:
          '{$request.body#/callbackUrl}':
            post:
              summary: Notify merchant
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/PaymentResult'
```

---

## 🧠 When to use:

- Webhooks
- Long-running ops
- External integrations (Stripe, PayPal, Slack)

---

## 🧪 Challenge

Document a webhook flow for:
- User signup
- Email verification callback

---