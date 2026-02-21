# DevOps YAML — Helm Charts (values.yaml, templates, overrides)

Helm is the package manager for Kubernetes.
It allows you to:
- template Kubernetes manifests
- reuse charts across environments
- override values dynamically
- publish versioned application packages
- manage releases and rollbacks

A Helm chart is essentially a **templated YAML bundle**.

This lesson explains:
- Chart structure  
- values.yaml  
- templates/  
- override strategies  
- chart installation  

---

# 📁 Helm Chart Folder Structure

A standard Helm chart looks like:

mychart/
Chart.yaml
values.yaml
templates/
deployment.yaml
service.yaml
ingress.yaml


### Chart.yaml
Metadata about the chart.

### values.yaml
Default values injected into templates.

### templates/
All actual Kubernetes manifests with templating syntax.

---

# 📘 Chart.yaml Example

```yaml
apiVersion: v2
name: myapp
description: A sample application chart
type: application
version: 1.0.0
appVersion: "2.4.1"
```
- `version` → chart version
- `appVersion` → container version

---

## 📦 values.yaml (The Defaults File)

```yaml
replicaCount: 2

image:
  repository: nginx
  tag: "1.25"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources: {}
```
These values flow into the templates.

---

## 🧱 Templating Example: deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.port }}
```

Templates use Go templating:
`{{ .Values.* }}`
`{{ .Chart.* }}`
`{{ .Release.* }}`

---

## 🧩 Overriding Values

Values from:
1. values.yaml
2. values-production.yaml
3. `--set key=value`
4. CI pipelines or ArgoCD

Example override file:

```yaml
replicaCount: 4

image:
  tag: "1.26"

service:
  type: LoadBalancer
```
Use:

```bash
helm install myapp ./mychart -f values-production.yaml
```

---

## 🐳 Image Tag Overrides (CI Pattern)

CI updates image tags automatically:

```bash
helm upgrade myapp ./mychart \
  --set image.tag=${GITHUB_SHA}
```
This allows GitOps-style versioning.

---

## 🔧 Advanced: Conditional Blocks

Use if blocks:

```yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
...
{{- end }}
```

This allows optional:
- ingress
- autoscaling
- metrics
- security contexts

---

## 📚 Using Helpers (_helpers.tpl)

Example fullname helper:

```yaml
{{- define "myapp.fullname" -}}
{{ .Chart.Name }}-{{ .Release.Name }}
{{- end }}
```

Use it inside templates:

```yaml
metadata:
  name: {{ include "myapp.fullname" . }}
```

---

## 🧠 Best Practices

- Keep templates simple — push logic into helpers
- Separate environment overrides:
```perl
values-dev.yaml
values-staging.yaml
values-prod.yaml
```
- Avoid hardcoding container tags — use .Values.image.tag
- Never commit secrets in values.yaml
- Use schemas (values.schema.json) to validate values
- Use Helm lint before committing:

```nginx
helm lint .
```

---

## 🧪 Challenge

Create a Helm chart with:
- deployment
- service
- ingress (conditional)
- replicaCount configurable
- image repository & tag configurable
- values-prod.yaml overriding:
    - 4 replicas
    - LoadBalancer service
    - image tag set to "stable"

Try installing it with:

```bash
helm install demo ./mychart -f values-prod.yaml
```

---