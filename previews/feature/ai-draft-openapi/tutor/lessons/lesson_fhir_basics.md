# Industry APIs — Healthcare HL7 FHIR

FHIR (Fast Healthcare Interoperability Resources) is the global standard for
exchanging healthcare data electronically.

FHIR is used for:
- patient records
- medical encounters
- lab results
- medications and prescriptions
- diagnostic imaging
- practitioner & provider records
- insurance claims
- scheduling and appointments

---

## 🧱 FHIR Core Ideas

FHIR is centered around **Resources**, such as:

- **Patient**
- **Encounter**
- **Observation**
- **DiagnosticReport**
- **Medication**
- **AllergyIntolerance**
- **Practitioner**
- **Coverage**

FHIR Resources follow a consistent pattern:
- `id`
- `meta`
- `resourceType`
- `identifier`
- `status`
- standard coded values (LOINC, SNOMED, RxNorm)

---

## 📘 FHIR-Style Patient Resource (YAML Representation)

```yaml
Patient:
  resourceType: Patient
  id: "12345"
  identifier:
    - system: "http://hospital.example.org/patient-id"
      value: "MRN-00112233"

  name:
    - family: "Smith"
      given: ["John"]

  gender: "male"
  birthDate: "1984-02-15"
```

FHIR uses:

- arrays for name and identifiers
- standardized codes for gender, marital status, administrative data

---

## 📦 FHIR Observation Example (Lab Result)

```yaml
Observation:
  resourceType: Observation
  id: "obs-123"
  status: "final"
  category:
    - coding:
        - system: "http://terminology.hl7.org/CodeSystem/observation-category"
          code: "laboratory"

  code:
    coding:
      - system: "http://loinc.org"
        code: "718-7"
        display: "Hemoglobin [Mass/volume] in Blood"

  subject:
    reference: "Patient/12345"

  effectiveDateTime: "2021-06-10T11:00:00Z"

  valueQuantity:
    value: 13.8
    unit: "g/dL"
```

Key concepts:
- LOINC is used for lab tests
- SNOMED CT used for clinical conditions
- Observation values follow strict types depending on measurement

---

## 📘 REST Endpoint Example (FHIR Server)

FHIR servers expose Resources directly as REST endpoints:

```yaml
paths:
  /Patient/{id}:
    get:
      summary: Get patient by ID
      responses:
        '200':
          description: Patient resource
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Patient"
```

FHIR standardizes:
- GET /Resource/{id}
- POST /Resource
- PUT /Resource/{id}
- GET /Resource?query=params

---

## 🧠 FHIR Modeling Tips

- Always include "resourceType"
- Use arrays for fields that can repeat (names, identifiers, addresses)
- Use CodeableConcept for standardized medical codes
- Use references:

```yaml
subject:
  reference: "Patient/123"
```
- Use official code systems (LOINC, SNOMED, RxNorm)

---

## 🧪 Challenge

Create a FHIR Encounter resource with:

- patient reference
- practitioner reference
- encounter class (inpatient / outpatient)
- diagnosis list
- admission & discharge timestamps

Expose an endpoint:

```nginx
POST /Encounter
```

using an `Encounter` schema

---