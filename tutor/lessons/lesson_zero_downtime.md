# Hyper-Advanced — Zero Downtime API Changes

Patterns:
- blue/green deployments
- canary releases
- shadow traffic
- staged rollouts
- feature flags

---

A **canary release** allows you to send a small percentage of traffic to a new API version before fully rolling it out.

This reduces risk and allows you to monitor:
- errors
- latency
- logs
- user impact

---

### 🟦 🔀 🟩 **Traffic Split Example**

v1 (stable API) → receives 90% of traffic
v2 (new API) → receives 10% of traffic

Over time, you gradually increase:

Stage 1 → v2 = 10%
Stage 2 → v2 = 25%
Stage 3 → v2 = 50%
Stage 4 → v2 = 100%

If errors spike at any stage → rollback to v1 instantly.

---

### 📘 Canary Routing (YAML Gateway Example)

```yaml
routes:
  - name: payments-v1
    paths: [ "/payments" ]
    upstream:
      service: payments-service-v1
    weight: 90

  - name: payments-v2
    paths: [ "/payments" ]
    upstream:
      service: payments-service-v2
    weight: 10
```

The gateway forwards traffic based on weight.

---

## 📈 Monitoring During Canary

Monitor:
- error rates (5xx, 4xx)
- latency percentiles (P95/P99)
- logs for anomalies
- payment failure patterns
- callback delays

---

## 🧪 Exercise

Document a canary rollout for:
- `/transactions` v2
- starting at 5%
- ramping to 20%, then 50%, then 100%