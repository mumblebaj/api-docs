# DevOps YAML — Terraform YAML-like HCL Patterns

Terraform does not use YAML — it uses **HCL (HashiCorp Configuration Language)**.

However, HCL feels like a cross between:
- YAML
- JSON
- function calls
- templating logic

This lesson helps YAML-native users understand Terraform by showing
**equivalent structures**, and demonstrates patterns used in real infra modules.

---

# 🧱 Terraform vs YAML Mental Model

| YAML Concept          | Terraform HCL Equivalent             |
|----------------------|---------------------------------------|
| key: value           | key = "value"                         |
| nested objects       | nested blocks                          |
| lists                | `[ ]` arrays                           |
| dictionaries/maps    | `{ key = value }` maps                 |
| variables            | variables.tf                           |
| defaults             | default =                              |
| includes             | modules                                |
| anchors/aliases      | locals                                 |

---

# 📘 Basic Terraform Structure

A minimal Terraform project:

main.tf
variables.tf
outputs.tf

---

# 📦 Provider Block (Equivalent to “import YAML source”)

```hcl
provider "aws" {
  region = var.aws_region
}
```

---

## 🧩 Variables (YAML → Terraform Comparison)

**YAML version:**

```yaml
replicas: 3
image: nginx:latest
```

**Terraform version:**

```hcl
variable "replicas" {
  type    = number
  default = 3
}

variable "image" {
  type    = string
  default = "nginx:latest"
}
```

Terraform separates variable declarations into variables.tf.

---

## 🧱 Resource Block (This is “Terraform Deployment YAML”)

Example: Create an EC2 instance

```hcl
resource "aws_instance" "web" {
  ami           = var.ami
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

Conceptually similar to:

```yaml
aws_instance:
  web:
    ami: ami-123456
    instance_type: t3.micro
    tags:
      Name: web-server
```

---

## 🔁 Locals (Terraform Equivalent to YAML Anchors/Aliases)

```h
locals {
  common_tags = {
    project = "demo"
    owner   = "team-a"
  }
}

resource "aws_s3_bucket" "a" {
  tags = local.common_tags
}
```

This mimics YAML anchors:

```yaml
common: &common
  project: demo
  owner: team-a

bucketA:
  <<: *common
```

---

## 🏗 Modules (Terraform’s Version of Reusable YAML Files)
**In YAML you might do:**

```yaml
include: ./redis.yml
```

**In Terraform:**

```h
module "redis" {
  source = "./modules/redis"
  size   = "small"
}
```
Modules are the backbone of reusable infrastructure.

---

## 🏷 Defining a Module (redis module)

```bash
modules/redis/
  main.tf
  variables.tf
  outputs.tf
```

Example:

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "demo-redis"
  node_type            = var.size == "small" ? "cache.t3.micro" : "cache.t3.medium"
}
```

Variables:

```hcl
variable "size" {
  type    = string
  default = "small"
}
```

---

## 📤 Outputs (Expose Values Like YAML Exports)

```hcl
output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
```
Equivalent to:

```yaml
outputs:
  redis_endpoint: redis.demo.local
```

---

## 🧠 Terraform Best Practices

- Use modules for anything reused
- Keep sensitive values in:
    - environment variables
    - Terraform Cloud/Enterprise
    - SSM Parameter Store
- Don’t hardcode regions / IDs / AMIs
- Use locals for repeated values
- Use terraform fmt
- Use terraform validate before commits
- Separate:
    - dev
    - staging
    - prod
      into folders with different backends

---

## 📦 Real Folder Layout Example

```css
infra/
  dev/
    main.tf
    variables.tf
    backend.tf
  staging/
  prod/

modules/
  vpc/
  redis/
  rds/
```

Each environment can have:
- separate state
- separate variables
- separate providers

---

## 🧪 Challenge

Create a small Terraform module called web_service that accepts:
- image
- container_port
- replicas

And deploys an AWS ECS service using:

```hcl
resource "aws_ecs_service" "svc" { ... }
```

Then:
- call it from main.tf
- set replicas to 2
- output its service name

---