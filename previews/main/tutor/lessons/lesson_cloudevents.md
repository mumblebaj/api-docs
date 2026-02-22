# AI & Eventing — CloudEvents Basics

CloudEvents is a **standard format for events**.

It solves the problem:
> "Every system sends events differently (custom JSON), how do we make them consistent?"

CloudEvents defines a small, standard **envelope** around event data so that
event routers, logs, consumers, and UIs can understand them consistently.

It is used with:
- HTTP webhooks
- Kafka, NATS, AMQP
- Cloud event buses (AWS, Azure, GCP)
- AI/ML pipelines
- Audit & telemetry events

---

## 🧱 CloudEvents Core Concepts

A CloudEvent has two main parts:

1. **Context (metadata)**
   - `id` — unique event ID
   - `source` — where the event came from
   - `type` — what kind of event this is
   - `subject` — the specific resource affected (optional)
   - `time` — when the event happened
   - `datacontenttype` — content type of the data
   - `data` — the actual payload

2. **Data (payload)**
   - The business content: order info, user info, prediction result, etc.
   - Can be JSON, XML, Protobuf, binary…

CloudEvents standardizes the **envelope**, not the business schema.

---

## 📘 Example: JSON CloudEvent (AI Inference)

```json
{
  "specversion": "1.0",
  "id": "a4fddf9c-91b2-4b65-bf56-037d7b74c1ab",
  "source": "urn:my-company:ml:sentiment-service",
  "type": "ml.inference.completed",
  "subject": "request/98234",
  "time": "2025-05-01T09:30:15Z",
  "datacontenttype": "application/json",
  "data": {
    "inputText": "This product is amazing!",
    "sentiment": "positive",
    "score": 0.96,
    "modelVersion": "sentiment-v3.1"
  }
}
```

Key points:
- `type` is event name, not HTTP verb
- `source` identifies the service or domain
- `subject` is often a specific resource (`request/98234`, `order/123`)

---

## 📦 YAML Representation (For Docs / Config)

CloudEvents are usually sent as JSON, but you can document them in YAML:

```yaml
specversion: "1.0"
id: "ce-12345"
source: "urn:payments-api"
type: "payment.completed"
subject: "payment/9e4a1f82-1234"
time: "2025-01-15T12:34:56Z"
datacontenttype: "application/json"
data:
  paymentId: "9e4a1f82-1234"
  amount: 125.50
  currency: "EUR"
  userId: "user-7890"
  status: "COMPLETED"
```

You can use this in:

AsyncAPI examples
- Event catalog docs
- Testing fixtures
- Contract testing of event consumers

---

## 🔌 CloudEvents over HTTP (Webhook Style)

CloudEvents can be encoded in HTTP headers + body.

Example (structured mode — JSON body contains full event):

```js
POST /webhook/events HTTP/1.1
Content-Type: application/cloudevents+json

{
  "specversion": "1.0",
  "id": "ce-789",
  "source": "urn:orders-service",
  "type": "order.created",
  "subject": "order/12345",
  "time": "2025-02-01T11:22:33Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "12345",
    "customerId": "c-001",
    "totalAmount": 42.00
  }
}
```

---

## 🧠 Designing Good CloudEvent Types

Recommendations:
- Use namespaced types:
    - `customer.created`
    - `order.canceled`
    - `ml.inference.completed`
    - `payment.status.changed`
- Use stable schemas for data
- Keep type semantic and version separately if needed:
    - `order.created.v2`
    - or version inside `data` (`schemaVersion: "2"`)

Do not encode environment into type:
- ✅ `order.created`
- ❌ `order.created.dev`

---

## 🌐 CloudEvents in Event-Driven Systems

CloudEvents works well with:
- Kafka topics (value = CloudEvent JSON)
- AsyncAPI (document message as CloudEvent)
- Function platforms (triggers use CloudEvents)
- AI pipelines:
    - `ml.training.started`
    - `ml.training.completed`
    - `ml.model.promoted`
    - `ml.inference.completed`

Using the same envelope format across services allows:
- unified logging
- consistent monitoring
- easier routing and filtering
- generic tools (viewers, replayers, debuggers)

---

## 🧪 Challenge

Design 2 CloudEvents for an AI document classification pipeline:
1. `ml.document.classified`
2. `ml.document.rejected`

For each event, include:
- `id`
- `source`
- `type`
- `subject` (e.g. `document/{id}`)
- `time`
- `datacontenttype`
- `data` with fields:
    - `documentId`
    - `labels` (array of strings)
    - `confidence` (0–1)
    - `reason` (for rejected documents)

Write them in **YAML form** as if you were adding them to your event documentation.

---

