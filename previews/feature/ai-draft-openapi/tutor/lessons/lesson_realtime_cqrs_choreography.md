# Real-time Event Processing, CQRS & Choreography

(Event Routers, Kafka Streams, Debezium CDC, Domain Events)

Modern distributed systems use event streams to react to data changes in real time.
This lesson covers:

- Real-time pipelines (Kafka Streams / Flink)
- CQRS pattern (Command Query Responsibility Segregation)
- Debezium CDC (Change Data Capture)
- Service choreography vs orchestration
- Event routers & message enrichment
- Projection models for read APIs

We express all of this cleanly using YAML configs.

---

## 🧠 1. What Is CQRS?

CQRS separates:

**Commands (write operations)**

- Create order
- Cancel invoice
- Approve payment

**Queries (read operations)**

- Get order status
- List transactions
- Fetch user profile

By splitting these concerns:

- Writes generate events
- Reads build materialized views (projections)
- System becomes event-driven and scalable
- Real-time updates flow from command-side to query-side

CQRS pairs naturally with event streaming systems like Kafka.

---

## 🔥 2. Real-time Event Processing Architecture

A typical flow:

```pgsql
Command Service  
   → emits domain events  
      → Kafka topics  
          → Kafka Streams / Flink → real-time transformations  
              → Materialized Views (Redis, ES, Postgres)  
                   → Query API responds instantly  
```

This gives:

- low write contention
- lightning-fast queries
- full event history
- auditability

---

## 🔌 3. Debezium CDC Configuration (YAML)

Debezium captures database changes (insert/update/delete) and publishes events automatically.

Example: MySQL connector:

```yaml
name: inventory-connector
config:
  connector.class: io.debezium.connector.mysql.MySqlConnector
  database.hostname: mysql
  database.port: "3306"
  database.user: debezium
  database.password: dbz
  database.server.id: "184054"
  database.server.name: inventory
  database.whitelist: customers,orders
  snapshot.mode: initial
  include.schema.changes: "true"
```

Debezium sends events like:

```json
{
  "op": "c",
  "source": { "table": "orders" },
  "after": { "id": 29, "status": "NEW", "total": 42.00 }
}
```

---

## ⚙ 4. Kafka Streams Topology (YAML DSL)

Kafka Streams topologies are often described in YAML before coding.

Example: **Order → Payment Enrichment:**

```yaml
topology:
  - name: read-orders
    from: orders
    to: orders-stream

  - name: read-payments
    from: payments
    to: payments-stream

  - name: join-orders-payments
    left: orders-stream
    right: payments-stream
    window: 5m
    type: left_join
    to: enriched-orders

  - name: write-projection
    from: enriched-orders
    to: order-projections
```

This produces:

- real-time `enriched-orders`
- used for dashboards
- used for customer notifications
- used to update read models

---

## 🛰 5. Real-time Projection Model (ElasticSearch YAML)

CQRS read side uses “projections” to build query models.

Example Elastic index:

```yaml
index:
  name: order_projection
  settings:
    number_of_shards: 3
  mappings:
    properties:
      orderId: { type: keyword }
      status:   { type: keyword }
      total:    { type: double }
      customer: { type: keyword }
      updatedAt:{ type: date }
```

Kafka Streams → Elastic updates in real time.

---

## 💬 6. Choreography vs Orchestration

Two competing patterns in distributed architecture:

---

## 🟦 Choreography (Event-driven, decentralized)

Services listen and act on each other's events:

```css
order.created → payment.authorize  
payment.authorized → inventory.reserve  
inventory.reserved → shipping.schedule  
```

Pros:
- loosely coupled
- scalable
- no central failure point

Cons:
- harder to debug
- invisible “business flow”

Represented in YAML via AsyncAPI:

```yaml
channels:
  order.created:
    subscribe:
      summary: Start payment process

  payment.authorized:
    subscribe:
      summary: Reserve inventory
```

---

## 🟧 Orchestration (central controller)

A central “brain” coordinates the workflow.

Example: Argo Workflow orchestrator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: process-order
spec:
  entrypoint: main
  templates:
    - name: main
      steps:
        - - name: authorize-payment
            template: payment
        - - name: reserve-inventory
            template: inventory
        - - name: schedule-shipping
            template: shipping
```

---

## ⚡ 7. Event Router YAML (Message Enrichment + Routing)

Event routers (Knative Eventing, AWS EventBridge, NATS JetStream) use YAML to define routing logic.

Example: Knative Trigger:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: high-value-orders
spec:
  broker: default
  filter:
    attributes:
      type: "order.created"
  subscriber:
    uri: http://fraud-service.default.svc.cluster.local
```

Another route for enrichment:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: enrich-orders
spec:
  broker: default
  filter:
    attributes:
      type: "order.created"
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-enrichment
```

---

## 🧩 8. Example: Full CQRS + CDC + Streams Pipeline (YAML Summary)
**1️⃣ Debezium Source (DB → events)**

```yaml
name: orders-cdc
config:
  connector.class: mysql
  database.whitelist: orderdb
  table.whitelist: orders
```

**2️⃣ Kafka Streams Join**

```yaml
topology:
  - name: enrich-orders
    left: orders
    right: payments
    type: inner_join
    to: orders.enriched
```

**3️⃣ Event Router → Two Consumers**

```yaml
triggers:
  - type: orders.enriched
    target: shipment-service
  - type: orders.enriched
    target: analytics-service
```

**4️⃣ Projection**

```yaml
index:
  name: order_projection
```

---

## 🧪 Challenge

Build a real-time order processing system using YAML with:

**1. Debezium configuration**

Capture orders table changes.

**2. Kafka Streams topology**

Join orders + payments
Output → orders.ready-for-shipment

**3. Event Router (Knative or EventBridge)**

Route events to:

- `shipping-service`

- `notification-service`

**4. ElasticSearch projection**

Store enriched order view.

**5. CQRS aspect**

Explain which parts are “command” vs “query”.

Represent everything in YAML where possible.