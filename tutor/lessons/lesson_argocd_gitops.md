# DevOps YAML — ArgoCD Applications & GitOps Workflow

ArgoCD is a **GitOps deployment controller** for Kubernetes.
It continuously watches a Git repository and syncs Kubernetes
manifests into your cluster.

Git becomes the **source of truth** for:
- deployments
- rollbacks
- configuration changes
- environment promotion
- multi-tenant applications

This lesson teaches how to model ArgoCD Applications and build a full
GitOps workflow using YAML.

---

# 🧱 What Is GitOps?

GitOps is based on the idea that your **entire infrastructure and app state**
should be declared in Git.

ArgoCD then:
- detects changes in Git
- applies them to Kubernetes
- monitors drift (Git vs cluster)
- automatically or manually syncs changes
- supports versioned rollbacks

---

# 📘 ArgoCD Application (Most Important Resource)

An `Application` tells ArgoCD:
1. **Where the manifests live** (Git repo, path, revision)  
2. **Where to deploy them** (cluster, namespace)  
3. **How to sync** (automated, manual, prune, self-heal)

Example:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example-org/myapp.git
    path: kubernetes/overlays/staging
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## 🧩 Key ArgoCD Concepts
**Source**

Where ArgoCD pulls manifests from:
- Git
- Helm chart repo
- Kustomize
- YAML directories
- OCI registry (for Helm)

**Destination**

Where it deploys:
- in-cluster
- external clusters
- test/staging/prod namespaces

**SyncPolicy**

Controls how changes are applied:
- manual sync
- automated sync
- auto-prune deleted resources
- self-heal drift

---

## 🎛 Multiple Applications with App-of-Apps Pattern

The App-of-Apps pattern is used for:
- multi-team platforms
- multi-tenant clusters
- environment bootstrapping

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-root
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/example-org/platform.git
    path: apps
    targetRevision: main

  destination:
    server: https://kubernetes.default.svc
    namespace: argocd

  syncPolicy:
    automated:
      prune: true
```
The `apps/` directory contains multiple sub-applications, e.g.:

apps/
  ├─ monitoring/
  ├─ ingress/
  ├─ logging/
  ├─ workloads/

ArgoCD deploys them ALL automatically.

---

## 🐳 Deploying Helm Charts with ArgoCD

ArgoCD can pull a Helm chart and apply overrides via `values.yaml`:

```yaml
spec:
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: redis
    targetRevision: 18.0.0
    helm:
      values: |
        auth:
          enabled: false
```

---

## 🧠 GitOps Best Practices

- Keep environment overlays in separate folders:

```bash
overlays/dev
overlays/staging
overlays/prod
```
- Never apply manifests manually — always push to Git
- Use automated sync + selfHeal for production stability
- Use app-of-apps for complex platforms
- Use health checks in custom resources
- Use Kustomize patches for environment differences
- Store all Kubernetes config in Git (RBAC, CRDs, ingresses)

---

## 📦 Full GitOps Workflow Example

```pgsql
Dev pushes code →
CI builds container →
CI pushes image to registry →
CI updates Git manifest (image tag) →
ArgoCD detects update →
Cluster syncs automatically →
Production updated with no kubectl commands
```

---

## 🧪 Challenge

Create an ArgoCD Application that deploys:
- a Helm chart (`nginx`)
- with custom values
- into the namespace `webapp`

Requirements:
- automated sync enabled
- self-heal enabled
- namespace auto-created
- repo path: `deploy/nginx`

Save it as `nginx-app.yaml` and apply using:

```powershell
kubectl apply -f nginx-app.yaml
```

---