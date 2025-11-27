// lessons.js — category-based lesson registry

export const lessonPacks = [

  // ---------------------------------------------------------
  // PACK A — YAML FUNDAMENTALS & OPENAPI FOUNDATIONS
  // ---------------------------------------------------------
  {
    id: "packA",
    title: "YAML & OpenAPI Fundamentals",
    lessons: [
      { id: "intro", title: "YAML Introduction", type: "builtin" },
      { id: "basics", title: "YAML Basics", type: "md", src: "./lessons/basics.md" },
      { id: "indentation", title: "Indentation Rules", type: "md", src: "./lessons/indentation.md" },
      { id: "lesson2", title: "Reading an OpenAPI File", type: "md", src: "./lessons/lesson2.md" },
      { id: "lesson3", title: "Required Fields in OpenAPI", type: "md", src: "./lessons/lesson3.md" },
      { id: "lesson_arrays", title: "Arrays & Objects in YAML", type: "md", src: "./lessons/lesson_arrays.md" },
      { id: "lesson_ref", title: "Using $ref in OpenAPI", type: "md", src: "./lessons/lesson_ref.md" },
      { id: "lesson_multi_doc", title: "Multi-Document YAML", type: "md", src: "./lessons/lesson_multi_doc.md" },
      { id: "lesson_anchors", title: "YAML Anchors & Aliases", type: "md", src: "./lessons/lesson_anchors.md" },
      { id: "lesson_mistakes", title: "Common YAML Mistakes", type: "md", src: "./lessons/lesson_mistakes.md" },
      { id: "lesson_jsonschema", title: "JSON Schema Basics", type: "md", src: "./lessons/lesson_jsonschema.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK B — INTERMEDIATE OPENAPI DESIGN
  // ---------------------------------------------------------
  {
    id: "packB",
    title: "Intermediate OpenAPI Design",
    lessons: [
      { id: "lesson_schema_design", title: "Designing Better Schemas", type: "md", src: "./lessons/lesson_schema_design.md" },
      { id: "lesson_crud_api", title: "Your First CRUD API", type: "md", src: "./lessons/lesson_crud_api.md" },
      { id: "lesson_request_bodies", title: "Reusable Request Bodies", type: "md", src: "./lessons/lesson_request_bodies.md" },
      { id: "lesson_parameters", title: "Parameters & Path Rules", type: "md", src: "./lessons/lesson_parameters.md" },
      { id: "lesson_polymorphism", title: "Polymorphism & Discriminator", type: "md", src: "./lessons/lesson_polymorphism.md" },
      { id: "lesson_discriminator", title: "Discriminator Deep Dive", type: "md", src: "./lessons/lesson_discriminator.md" },
      { id: "lesson_errors", title: "Error Object Design", type: "md", src: "./lessons/lesson_errors.md" },
      { id: "lesson_links", title: "OpenAPI Links", type: "md", src: "./lessons/lesson_links.md" },
      { id: "lesson_callbacks", title: "Callbacks & Webhooks", type: "md", src: "./lessons/lesson_callbacks.md" },
      { id: "lesson_callback_security", title: "Callback Security", type: "md", src: "./lessons/lesson_callback_security.md" },
      { id: "lesson_runtime_validation", title: "Runtime Validation", type: "md", src: "./lessons/lesson_runtime_validation.md" },
      { id: "lesson_pagination", title: "Pagination Best Practices", type: "md", src: "./lessons/lesson_pagination.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK C — ADVANCED API DESIGN & ENTERPRISE PATTERNS
  // ---------------------------------------------------------
  {
    id: "packC",
    title: "Advanced API Design & Enterprise Patterns",
    lessons: [
      { id: "lesson_versioning", title: "API Versioning Strategies", type: "md", src: "./lessons/lesson_versioning.md" },
      { id: "lesson_backward_compat", title: "Backward Compatibility", type: "md", src: "./lessons/lesson_backward_compat.md" },
      { id: "lesson_api_lifecycle", title: "API Lifecycle Management", type: "md", src: "./lessons/lesson_api_lifecycle.md" },
      { id: "lesson_enterprise", title: "Enterprise API Architecture", type: "md", src: "./lessons/lesson_enterprise.md" },
      { id: "lesson_observability", title: "API Observability", type: "md", src: "./lessons/lesson_observability.md" },
      { id: "lesson_gateway_policy", title: "API Gateway Policies", type: "md", src: "./lessons/lesson_gateway_policy.md" },
      { id: "lesson_governance_pipeline", title: "Governance Pipelines", type: "md", src: "./lessons/lesson_governance_pipeline.md" },
      { id: "lesson_linting", title: "API Linting & Governance", type: "md", src: "./lessons/lesson_linting.md" },
      { id: "lesson_contract_testing", title: "Contract Testing", type: "md", src: "./lessons/lesson_contract_testing.md" },
      { id: "lesson_mock_servers", title: "Mock Servers", type: "md", src: "./lessons/lesson_mock_servers.md" },
      { id: "lesson_zero_downtime", title: "Zero-Downtime Deployments", type: "md", src: "./lessons/lesson_zero_downtime.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK D — INDUSTRY API MODELS
  // ---------------------------------------------------------
  {
    id: "packD",
    title: "Industry API Models",
    lessons: [
      { id: "lesson_iso20022", title: "ISO 20022 Payments", type: "md", src: "./lessons/lesson_iso20022_basics.md" },
      { id: "lesson_acord", title: "Insurance (ACORD)", type: "md", src: "./lessons/lesson_acord_basics.md" },
      { id: "lesson_tmforum", title: "Telecom TM Forum APIs", type: "md", src: "./lessons/lesson_tmforum_openapi.md" },
      { id: "lesson_fhir", title: "Healthcare HL7 FHIR", type: "md", src: "./lessons/lesson_fhir_basics.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK E — EVENTING, EDA, ASYNCAPI
  // ---------------------------------------------------------
  {
    id: "packE",
    title: "Eventing, EDA & AsyncAPI",
    lessons: [
      { id: "lesson_asyncapi_intro", title: "AsyncAPI Introduction", type: "md", src: "./lessons/lesson_asyncapi_intro.md" },
      { id: "lesson_eda", title: "Event-Driven Architecture (EDA)", type: "md", src: "./lessons/lesson_eda.md" },
      { id: "lesson_k8s", title: "Kubernetes YAML Basics", type: "md", src: "./lessons/lesson_k8s.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK F — DEVOPS & PLATFORM ENGINEERING (Pack C content)
  // ---------------------------------------------------------
  {
    id: "packF",
    title: "DevOps & Platform Engineering",
    lessons: [
      { id: "lesson_docker_compose", title: "Docker Compose Deep Dive", type: "md", src: "./lessons/lesson_docker_compose_basics.md" },
      { id: "lesson_github_actions_legacy", title: "GitHub Actions Basics", type: "md", src: "./lessons/lesson_github_actions.md" },
      { id: "lesson_github_actions_advanced", title: "GitHub Actions Advanced", type: "md", src: "./lessons/lesson_github_actions_advanced.md" },
      { id: "lesson_argocd", title: "ArgoCD & GitOps", type: "md", src: "./lessons/lesson_argocd_gitops.md" },
      { id: "lesson_helm", title: "Helm Charts", type: "md", src: "./lessons/lesson_helm_charts.md" },
      { id: "lesson_terraform", title: "Terraform HCL Patterns", type: "md", src: "./lessons/lesson_terraform_hcl_patterns.md" }
    ]
  },

  // ---------------------------------------------------------
  // PACK G — AI & EVENTING
  // ---------------------------------------------------------
  {
    id: "packG",
    title: "AI & Eventing",
    lessons: [
      { id: "lesson_cloudevents", title: "CloudEvents Fundamentals", type: "md", src: "./lessons/lesson_cloudevents.md" },
      { id: "lesson_asyncapi_streams", title: "AsyncAPI 3.0 & Event Streams", type: "md", src: "./lessons/lesson_asyncapi_streams.md" },
      { id: "lesson_ml_pipelines", title: "ML Pipelines & Model Deployment", type: "md", src: "./lessons/lesson_ml_pipelines.md" },
      { id: "lesson_mlops_observability", title: "MLOps Monitoring & Drift Detection", type: "md", src: "./lessons/lesson_mlops_observability.md" },
      { id: "lesson_event_stream_processing", title: "Real-time Event Processing & CQRS", type: "md", src: "./lessons/lesson_event_stream_processing.md" }
    ]
  }
];
