# Ultra-Advanced — Introduction to AsyncAPI

AsyncAPI describes **event-driven and message-based** systems.

Ideal for:
- Kafka
- MQTT
- WebSockets
- AMQP (RabbitMQ)
- Event buses

---

## 📘 Minimal AsyncAPI Example

```yaml
asyncapi: 3.0.0
info:
  title: Notification Service
  version: 1.0.0

channels:
  user/signedup:
    subscribe:
      message:
        $ref: '#/components/messages/UserSignedUp'
```

---

## 📦 Defining Messages

```yaml
components:
  messages:
    UserSignedUp:
      payload:
        type: object
        properties:
          id: { type: string }
          email: { type: string }
```

---

## 🧪 Exercise

Model a message:
- Name: `PaymentCompleted`
- Fields: `id`, `amount`, `status`

---