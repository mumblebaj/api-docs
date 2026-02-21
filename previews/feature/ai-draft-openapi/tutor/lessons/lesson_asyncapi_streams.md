# AsyncAPI 3.0 & Event Streams (Modern Event-Driven APIs)

AsyncAPI is the OpenAPI equivalent for event-driven systems.

It solves the problem:

> “How do we describe Kafka/NATS/WebSockets streams the same way OpenAPI describes REST?”

AsyncAPI 3.0 introduces:
- Channels (topics/streams)
- Messages (payload formats)
- Servers (Kafka, NATS, MQTT, WebSocket…)
- Bindings (protocol-specific config)
- Components (shared schemas)
- Operations: `publish` (producer) / `subscribe` (consumer)

AsyncAPI is structured like OpenAPI, but for streaming.

---

## 🌐 1. AsyncAPI 3.0 Structure

```yaml
asyncapi: "3.0.0"
info:
  title: Payment Events
  version: "1.0.0"

servers:
  kafkaCluster:
    protocol: kafka
    url: kafka1:9092

channels:
  payment.completed:
    messages:
      default:
        $ref: "#/components/messages/PaymentCompleted"
    operations:
      publish:
        summary: Emit payment completion events
      subscribe:
        summary: Consume payment completion events

components:
  messages:
    PaymentCompleted:
      payload:
        $ref: "#/components/schemas/PaymentCompleted"
  schemas:
    PaymentCompleted:
      type: object
      properties:
        paymentId:
          type: string
        amount:
          type: number
        currency:
          type: string
        status:
          type: string
```

Key takeaways:
- channels = Kafka topics / WebSocket paths / EventBus routes
- publish = application produces messages
- subscribe = application consumes messages
- components = reusable schemas and message definitions

---

## 📦 2. Using CloudEvents with AsyncAPI

AsyncAPI supports CloudEvents as message payloads:

```yaml
components:
  messages:
    MlInferenceCompleted:
      contentType: application/cloudevents+json
      payload:
        type: object
        properties:
          specversion: { type: string }
          id: { type: string }
          type: { type: string }
          source: { type: string }
          data:
            $ref: "#/components/schemas/InferenceData"
```

CloudEvents + AsyncAPI =  
**portable, consistent event formats across services.**

---

## ⚡ 3. AsyncAPI for Streaming AI & ML Pipelines

AsyncAPI excels at documenting:
- real-time inference
- model predictions on streams
- data pipelines
- sensor data
- distributed ML workflows

Example: Inference stream using Kafka:

```yaml
channels:
  ml.inference.results:
    messages:
      inferenceMessage:
        $ref: "#/components/messages/InferenceEvent"
    operations:
      publish:
        summary: ML model publishes inference results

components:
  messages:
    InferenceEvent:
      payload:
        $ref: "#/components/schemas/InferenceResult"

  schemas:
    InferenceResult:
      type: object
      properties:
        requestId: { type: string }
        sentiment: { type: string }
        score: { type: number }
        modelVersion: { type: string }
```

---

## 🔌 4. AsyncAPI Bindings (Kafka Example)

Protocol bindings add transport-specific settings.

```yaml
channels:
  payments.completed:
    bindings:
      kafka:
        topic: payments.completed
```

Message-level bindings:

```yaml
components:
  messages:
    PaymentUpdated:
      bindings:
        kafka:
          key:
            type: string
```

Useful for:
- partitions
- consumer groups
- message keys
- headers
- delivery guarantees

---

## 🚀 5. AsyncAPI Example — ML Training Pipeline

Here’s a more advanced example for your Tutor:

```yaml
asyncapi: "3.0.0"
info:
  title: ML Training Pipeline
  version: "1.0.0"

servers:
  kafkaML:
    protocol: kafka
    url: kafka-1:9092

channels:
  ml.training.started:
    messages:
      default:
        $ref: "#/components/messages/TrainingStarted"
    operations:
      publish:
        summary: Informs that training began

  ml.training.completed:
    messages:
      default:
        $ref: "#/components/messages/TrainingCompleted"
    operations:
      publish:
        summary: Informs that training completed

components:
  messages:
    TrainingStarted:
      payload:
        $ref: "#/components/schemas/TrainingStarted"

    TrainingCompleted:
      payload:
        $ref: "#/components/schemas/TrainingCompleted"

  schemas:
    TrainingStarted:
      type: object
      properties:
        modelName: { type: string }
        dataset: { type: string }
        hyperparameters:
          type: object
          additionalProperties: {}

    TrainingCompleted:
      type: object
      properties:
        modelName: { type: string }
        accuracy: { type: number }
        loss: { type: number }
        modelVersion: { type: string }
```

---

## 🧪 6. Challenge

Build an AsyncAPI 3.0 definition for a real-time fraud detection engine with:

**Channels**
- fraud.transaction.analyzed
- fraud.alert.triggered

**Consumers / Producers**
- Engine publishes analyzed transactions
- Monitoring systems subscribe to alerts

**Payload fields**

Transaction Analyzed
- transactionId
- amount
- cardType
- location
- riskScore
- timestamp

**Alert Triggered**
- alertId
- transactionId
- riskLevel
- message
- timestamp

Write it in **AsyncAPI YAML** using:
- channels
- messages
- schemas
- server (Kafka or NATS)
- publish/subscribe

---