# DevOps YAML — GitHub Actions CI/CD (Advanced)

GitHub Actions uses YAML workflows stored under:

.github/workflows/*.yml

These workflows can automate:
- builds
- tests
- packaging
- deployments
- infrastructure automation
- code quality & linting
- scheduled tasks
- environment approvals

This lesson teaches advanced GitHub Actions features used in real CI/CD pipelines.

---

## 🧱 Basic Workflow Structure

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
```

Each workflow contains:
- jobs
- steps
- runners
- conditions
- matrix strategies

---

## 📘 Job Example: Node.js Build & Test

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm test
```

---

## 🧩 Matrix Builds

Matrix allows parallel testing of different versions.

```yaml
strategy:
  matrix:
    node: [16, 18, 20]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node }}
```

Results:

- job 1 → Node 16
- job 2 → Node 18
- job 3 → Node 20

---

## 🗂 Artifact Uploads

```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/
```
Artifacts allow downloading build outputs from the workflow UI.

---

## ⚡ Caching Dependencies (Huge Speed Boost)

```yaml
- name: Cache Node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```
Caching is essential in large CI pipelines.

---

## 🧪 Conditional Steps

Run only on PRs:

```yaml
if: github.event_name == 'pull_request'
```

Run only when previous job succeeded:

```yaml
if: success()
```

Run only on tagged releases:

---

## 🔐 Using Secrets

```yaml
- name: Docker login
  run: echo $CR_PAT | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
  env:
    CR_PAT: ${{ secrets.GHCR_PAT }}
```

Secrets are stored in:

```nginx
Repo → Settings → Secrets → Actions
```

---

## 🐳 Building & Publishing Docker Images

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_PAT }}

      - name: Build image
        run: docker build -t ghcr.io/${{ github.repository }}:latest .

      - name: Push image
        run: docker push ghcr.io/${{ github.repository }}:latest
```

---

## 🚀 Deployments With Environments

GitHub supports protected environments:

```yaml
environment:
  name: production
  url: https://api.myapp.com
```

You can require:
- approvals
- deployment branches
- secrets only available in that environment

---

## 🔁 Reusable Workflows (DRY Pattern)

Call a shared workflow:

```yaml
jobs:
  call-tests:
    uses: ./.github/workflows/test.yml
    with:
      node-version: 20
```
Reusable workflows reduce duplication in large repos.

---

## 🕒 Scheduled Jobs (Cron)

```yaml
on:
  schedule:
    - cron: "0 3 * * *"   # every day at 03:00 UTC
```
Useful for:
- nightly builds
- sync jobs
- cleanup tasks

---

## 🧠 Best Practices

- Use checkout@v4, setup-node@v4, upload-artifact@v4, etc.
- Always pin major versions of actions.
- Use caching for all package installations.
- Use environments for prod deployments.
- Use reusable workflows in monorepos.
- For Docker: prefer GHCR over Docker Hub.

---

## 🧪 Challenge

Create a workflow that:
- Runs tests on Node 18 & 20 using a matrix
- Builds a Docker image only on main
- Uploads test reports as artifacts
- Deploys to the staging environment on successful merge

Try storing the file as:

```bash
.github/workflows/ci.yml
```

---