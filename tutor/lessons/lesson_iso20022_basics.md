# Industry APIs — ISO 20022 Style Payments API

The banking world relies heavily on **ISO 20022**, a global standard for
financial messages used by:
- SWIFT
- SEPA
- FedWire
- Real-time payment systems
- Cross-border transfers

This lesson teaches you how to represent ISO-style fields and structures
using YAML/OpenAPI notation.

---

## 🧱 ISO 20022 Key Concepts

- **UETR** — unique end-to-end transaction reference  
- **Debtor** — the party sending funds  
- **Creditor** — the party receiving funds  
- **FIToFICustomerCreditTransfer** — standardized cross-bank payment  
- **Structured remittance** — standardized payment purpose fields  
- **Instruction for next agent** — routing rules for intermediaries  

---

## 📘 ISO-Style Payment Schema (OpenAPI YAML)

```yaml
components:
  schemas:
    PaymentRequest:
      type: object
      required:
        - uetr
        - debtor
        - creditor
        - instructedAmount
        - currency
      properties:
        uetr:
          type: string
          description: Unique end-to-end transaction reference (UUID)
          pattern: '^[0-9a-fA-F-]{36}$'

        instructedAmount:
          type: number
          description: Amount instructed by the debtor
          minimum: 0.01

        currency:
          type: string
          minLength: 3
          maxLength: 3
          example: "EUR"

        debtor:
          type: object
          properties:
            name: { type: string }
            account:
              type: string
              description: IBAN of the sending account
              pattern: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$'

        creditor:
          type: object
          properties:
            name: { type: string }
            account:
              type: string
              description: IBAN of the receiving account
```

---

## 📦 Example Payment Initiation Endpoint

```yaml
paths:
  /payments:
    post:
      summary: Initiate a cross-border payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
      responses:
        '202':
          description: Accepted for processing
          headers:
            UETR:
              description: Transaction reference
              schema: { type: string }
```

---

## 🧠 ISO 20022 Style Tips

- Use strict patterns for identifiers (IBAN, BIC, UETR)
- Use 3-letter currency codes (ISO 4217)
- Use clear financial semantics (debtor vs creditor)
- Include status endpoints for post-submission processing

---

## 🧪 Challenge

Create a PaymentStatus schema that includes:
- transactionStatus
- statusReason
- lastUpdatedTimestamp
- creditorAgent BIC
- debtorAgent BIC
- And a `/payments/{uetr}/status` endpoint that returns it.

---