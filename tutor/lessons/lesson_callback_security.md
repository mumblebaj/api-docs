# Hyper-Advanced — Callback Security

Callbacks (webhooks) introduce security risks:
- spoofed webhook senders
- replay attacks
- fraudulent callback URLs
- lack of payload integrity

This lesson covers secure webhook patterns.

---

## 🔐 1. HMAC Signature Verification

Use shared secret → client verifies signature:

```yaml
components:
  securitySchemes:
    WebhookSignature:
      type: apiKey
      in: header
      name: X-Signature
```

Example:

```yaml
X-Signature: sha256=4ab2df3a1...
```

Client must compute:

```scss
HMAC(secret, raw_payload)
```
and compare.

---

## 🔐 2. Mutual TLS (mTLS)
Webhook sender and receiver authenticate each other via certificates.

```yaml
servers:
  - url: https://merchant.com/webhook
    description: Callback URL (mTLS required)
    x-mtls-required: true
```

---

## 🔐 3. Callback URL Validation
Validate callback URLs BEFORE triggering.

```yaml
callbacks:
  onResult:
    '{$request.body#/callbackUrl}':
      post:
        security:
          - ApiKeyAuth: []
```

---

## 🧪 Challenge

Document a payment callback that requires:
- HMAC signature
- callback URL allow-list

---