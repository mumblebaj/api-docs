# Industry APIs — ACORD Insurance Data Model

ACORD is the global data standard for insurance.
It is used across:
- Property & Casualty (P&C)
- Life Insurance
- Reinsurance
- Automated underwriting
- Claims management
- Policy issuance

This lesson teaches how to model ACORD-style insurance objects using
YAML/OpenAPI.

---

## 🧱 ACORD Core Concepts

**Policy** — an insurance contract between insurer & insured  
**Insured** — person or entity covered  
**Coverage** — what risks the policy protects against  
**Premium** — the price  
**Loss** — an insured event (accident, theft, damage)  
**Claim** — request for payment from the insurer  
**ClaimStatus** — lifecycle of a claim (open, pending, closed, rejected)

ACORD models rely heavily on:
- standardized terminology  
- structured address & entity models  
- coded values  
- financial amounts with strict precision  

---

# 📘 ACORD-Style Policy Schema (OpenAPI)

```yaml
components:
  schemas:
    Policy:
      type: object
      required:
        - policyNumber
        - insured
        - coverages
        - effectiveDate
        - expirationDate
      properties:
        policyNumber:
          type: string
          description: Unique policy identifier assigned by insurer

        effectiveDate:
          type: string
          format: date

        expirationDate:
          type: string
          format: date

        insured:
          type: object
          properties:
            name: { type: string }
            address:
              type: object
              properties:
                line1: { type: string }
                city:  { type: string }
                country: { type: string, minLength: 2, maxLength: 2 }

        coverages:
          type: array
          description: List of applied coverages
          items:
            type: object
            properties:
              coverageCode:
                type: string
                description: "ACORD standardized coverage code"
                example: "COV-COLLISION"

              limitAmount:
                type: number

              deductibleAmount:
                type: number
```

---

## 📦 Claim Reporting (ACORD FNOL — First Notice of Loss)

The "First Notice of Loss" (FNOL) is a core ACORD workflow.

```yaml
paths:
  /claims:
    post:
      summary: Report a new claim (FNOL)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Claim"
      responses:
        '201':
          description: Claim created
```

## 🎯 Claim Schema

```yaml
components:
  schemas:
    Claim:
      type: object
      required:
        - claimNumber
        - policyNumber
        - lossDate
        - lossDescription
        - claimStatus
      properties:
        claimNumber:
          type: string

        policyNumber:
          type: string

        lossDate:
          type: string
          format: date-time

        lossDescription:
          type: string

        claimStatus:
          type: string
          enum: [Open, Pending, Closed, Rejected]
```

---

# 🧠 ACORD Insurance Modeling Tips

- Use strict coded sets (ACORD has thousands of standardized codes)
- Separate Policy and Claim domains cleanly
- Addresses follow structured ACORD format
- Coverage codes are usually enumerations or ISO-like type codes
- Monetary values require strict precision (2 decimals)

---

## 🧪 Challenge

Model a Vehicle Loss Claim with the following fields:
- vehicleVIN
- lossType (enum: Collision, Theft, Fire, Weather, Other)
- estimatedDamageAmount
- policeReportNumber (optional)

And expose the endpoint:

```bash
POST /claims/vehicle
```

using `ClaimVehicleLoss` schema.