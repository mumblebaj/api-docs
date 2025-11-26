# Industry APIs — Telecom TM Forum OpenAPI

The TM Forum OpenAPI initiative defines **standardized REST APIs**
used globally by telecom operators and digital service providers.

These APIs cover:
- customer onboarding
- product catalog / offers
- service ordering and provisioning
- SIM and device activation
- billing and usage reporting
- trouble tickets and support requests

This lesson introduces TM Forum data patterns and models.

---

## 🧱 TM Forum Core Concepts

**Party** — a person or organization  
**Customer** — a party consuming telecom services  
**Product** — a commercial offering  
**Service** — a technical service activated in the network  
**Order** — commercial request to buy/change/terminate a product  
**ServiceOrder** — technical provisioning (network activation)  
**Usage** — metered service usage (SMS, minutes, data, events)

TM Forum models use:
- consistent resource structures
- hypermedia-like relationships
- standard fields (`id`, `href`, `state`, `validFor`)
- structure inheritance (“*EntityRef*” patterns)

---

# 📘 TM Forum-Style Product Schema (Simplified)

```yaml
components:
  schemas:
    Product:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: string
        href:
          type: string
          description: API reference link to the product
        name:
          type: string
        description:
          type: string

        status:
          type: string
          enum: [active, inactive, terminated]

        startDate:
          type: string
          format: date-time

        relatedParty:
          type: array
          items:
            type: object
            properties:
              id: { type: string }
              role: { type: string }
```

A Product references:
- the subscriber (relatedParty)
- lifecycle status
- start date / validity

---

## 📦 Example — TMF Service Order Endpoint

A Service Order is used to activate, modify, or terminate a telecom service.

```yaml
paths:
  /serviceOrder:
    post:
      summary: Submit a new Service Order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ServiceOrder"
      responses:
        '201':
          description: Service order submitted
```

**ServiceOrder Schema**

```yaml
components:
  schemas:
    ServiceOrder:
      type: object
      required: [id, orderItem]
      properties:
        id:
          type: string

        externalId:
          type: string
          description: ID provided by external system

        priority:
          type: string
          enum: [high, medium, low]

        orderItem:
          type: array
          description: Items inside the order (add, modify, delete)
          items:
            $ref: "#/components/schemas/ServiceOrderItem"
```

**ServiceOrderItem**

```yaml
components:
  schemas:
    ServiceOrderItem:
      type: object
      required: [id, action, service]
      properties:
        id:
          type: string
        action:
          type: string
          enum: [add, modify, delete]

        service:
          type: object
          properties:
            id: { type: string }
            name: { type: string }
            serviceType: { type: string }
```

---

# 📡 TM Forum EntityRef Pattern

Many TMF APIs reuse reference objects:

```yaml
EntityRef:
  type: object
  properties:
    id: { type: string }
    href: { type: string }
    name: { type: string }
```

This pattern appears in:
- ProductRef
- PartyRef
- ServiceRef
- ResourceRef

It enables lightweight linking between APIs.

---

# 🧠 TM Forum Modeling Tips

- Use EntityRef patterns instead of embedding full objects
- Include href in references to allow navigation
- Use state/status fields consistently
- Use validFor:

```yaml
validFor:
  startDateTime: ...
  endDateTime: ...
```

- Use action enums on orders (add / modify / delete)
- Keep commercial order separate from technical service order

---

## 🧪 Challenge

Create a TMF-style ProductOrder that includes:
- product offerings
- order items
- order action (add/remove/modify)
- customer reference (using PartyRef)
- expected completion date

Expose an endpoint:

```bash
POST /productOrder
```

Return the resulting order with:
- id
- href
- state
- orderItem results

---