# MLOps Monitoring, Drift & Observability

Modern AI systems require continuous monitoring to ensure deployed models behave correctly, stay accurate, and do not degrade over time.

MLOps Observability includes:

- model performance
- drift detection
- data quality
- bias monitoring
- production metrics
- real-time alerts
- automated retraining triggers

This lesson covers monitoring patterns expressed in YAML using tools like:

- Prometheus
- Grafana
- EvidentlyAI
- Argo Workflows
- CloudEvents (alerts & triggers)

---

## 🧠 1. What Is Model Drift?

Model drift occurs when your model’s behavior no longer matches the real world.

Two kinds:

### 1️⃣ Data Drift

Input distributions change:

- new words
- new patterns
- different customer behavior
- seasonal changes
- API payload shape changes

### 2️⃣ Concept Drift

The meaning of data changes:

- model predicting fraud no longer correlates with actual fraud
- medical model trained pre-pandemic becomes outdated
- sentiment analysis no longer matches current slang

Monitoring drift ensures:

- accuracy stays high
- models remain trustworthy
- bad predictions don’t propagate

---

## 🔎 2. Metrics You Must Track in Production

### Input Data Metrics

- missing values
- schema changes
- distribution histograms
- categorical counts
- outliers

### Model Metrics

- accuracy
- F1 score
- precision/recall
- latency
- throughput
- error rate

### Operational Metrics

- GPU/CPU usage
- memory
- batch success rate
- queue size / lag

All of these can be defined via YAML config.

---

## 📈 3. Prometheus Rules for ML Monitoring (YAML)

Prometheus is the backbone of ML observability.

Example: detecting a spike in prediction errors

```yaml
groups:
  - name: ml_model_alerts
    rules:

      - alert: HighPredictionError
        expr: rate(model_prediction_errors_total[5m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "Prediction errors exceeded threshold"
          description: |
            The model has more than 5 prediction errors/min.
```

---

## 🔥 4. Prometheus Rule — Drift Detection (via distribution change)

You export drift metrics with:

- EvidentlyAI
- Custom Python exporters
- Feature Store monitors

Prometheus alert:

```yaml
groups:
  - name: drift_detector
    rules:
      - alert: DataDriftDetected
        expr: model_feature_drift_score > 0.3
        labels:
          severity: critical
        annotations:
          summary: "Data drift detected"
          description: |
            Drift score has crossed 0.3 threshold.
```

Here `model_feature_drift_score` is produced by Evidently.

---

## 📊 5. EvidentlyAI Monitoring YAML (Report Definition)

Evidently uses declarative YAML configs for monitoring.

Example: drift report:

```yaml
columns:
  numerical:
    - age
    - salary
  categorical:
    - job_title
    - region

metrics:
  - data_drift:
      confidence: 0.95
  - column_drift:
      column_name: salary
  - classification_performance
```

This config produces:
- data drift charts
- feature drift reports
- performance dashboards

---

## 🚀 6. Evidently Batch Monitoring (Full YAML job)

```yaml
dataset:
  timestamp: timestamp
  reference_data: "gs://ml/reference.csv"
  current_data: "gs://ml/current.csv"

metrics:
  - data_drift:
  - data_quality:

output:
  dashboard: "gs://ml/dashboards/data_drift.html"
  raw: "gs://ml/metrics/data_drift.json"
```

---

## 📡 7. Drift Alert as a CloudEvent (trigger workflows)

When drift is detected, we emit an event:

```yaml
specversion: "1.0"
id: "drift-99201"
type: "ml.data.drift.detected"
source: "urn:drift-detector"
time: "2025-01-23T12:00:00Z"
data:
  feature: "salary"
  driftScore: 0.44
  threshold: 0.30
  modelVersion: "salary-predictor-v5"
```

This can trigger:
- Argo retraining workflows
- Canary rollback
- Alerts to Slack/Teams

---

## ⚙ 8. Argo Workflow Triggered by Drift Event

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: retrain-model
spec:
  entrypoint: main
  templates:
    - name: main
      steps:
        - - name: retrain
            template: train
    - name: train
      container:
        image: gcr.io/ml/train:latest
        command: ["python", "train.py"]

---
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: drift-sensor
spec:
  dependencies:
    - name: drift-event
      eventSourceName: ce-source
      eventName: drift
  triggers:
    - template:
        name: run-retrain
        k8s:
          group: argoproj.io
          version: v1alpha1
          resource: Workflow
          operation: create
          source:
            resource:
              metadata:
                generateName: retrain-triggered-
              spec:
                entrypoint: main
```
This is production-grade MLOps.

---

## 🛰 9. Observability Stack (Recommended Architecture)

Monitoring should combine:

**Prometheus → metrics**

Accuracy, drift score, latency, CPU, GPU

**Grafana → dashboards**

Model health, timeline, latency heatmaps

**EvidentlyAI → drift analysis**

Feature drift, data quality, target drift

**CloudEvents → alerts & triggers**

ml.data.drift.detected, ml.performance.degraded

**Argo / Kubeflow → remediation**

Automatic retraining, canary rollback

**S3/GCP Buckets → model lineage**

Store metrics, artifacts, and timestamps

This architecture is the industry standard.

---

## 🧪 Challenge

Build an MLOps observability YAML pack containing:

**1. Prometheus alert**

- Detects accuracy dropping below 0.85

- Severity: “critical”

**2. EvidentlyAI drift config**

- Detect drift on two numerical features

- Detect quality issues (missing values)

**3. CloudEvent alert**

Type: `ml.performance.degraded`

**4. Argo Workflow**

- Redeploy model if performance degraded

- Include one container step: `deploy.py`

- Triggered by CloudEvent

Make sure each piece integrates logically.

---