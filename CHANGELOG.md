# Changelog

## [1.9.1]
### Split OpenAPI v3.1x validations
- Split validation for OpenAPI v3.1.x intoit's own validation spec
- Add more validations to make it a little more robust.

<details>

<summary>[1.9.0] Add local validation for OpenAPI 3.1.x</summary>

## [1.9.0]
### Add local validation for OpenAPI 3.1.x
Exprienced a compile issue with the latest libraries for v3.1.x and 3.2.x. Had to remove the OpenAPI validations as it eats too much memory taking away from the snappy USS workflow.

Polishing the validations for 3.1.x local.

</details>

<details>

<summary>[1.8.0] Add Support for OpenAPI v3.1 and v3.2</summary>

## [1.8.0]
### Add Support for OpenAPI v3.1 and v3.2
- Added support for OpenAPI v3.1 and OpenApi v3.2
- Vendored the required validations and schemas as well as dialects

</details>

<details>

<summary>[1.7.8] OpenAPI Validation Refactor</summary>

## [1.7.8]
### OpenAPI Validation Refactor
Split the monolithic openapiEditor into more manageable pieces.

#### Refactor goals
1. One source of truth for validation (schema + semantic + refs + warnings)
2. Keep Monaco integration stable (AMD/RequireJS remains unchanged)
3. Separate concerns:
  - validation engine
  - resource loading (ReDoc, JSON meta schema fetch)
  - preview rendering
  - UI feedback (status/toasts/markers)
  - editor lifecycle

This now ensures that `openapiEditor.js` remains as the "boot" script Monaco call and all other logic is moved into manageable modules paving the way to the next big migration

#### Next migration step
- Migrate from `OpenAPI 3.0` ro `OpenAPI 3.1`
- Migrate from `Ajv Draft-04` to `Ajv v8`
- Use `JSON Schema 2020-12`
- Switch schema source to `OAS 3.1`

</details>

<details>

<summary>[1.7.4] Validation Engine Overhaul </summary>

## [1.7.4]
## Validation Engine Overhaul
### 🔥 OpenAPI Validation Engine Rewritten

Universal Schema Studio now uses a fully deterministic, browser-native OpenAPI validation engine.

This release replaces all legacy validation mechanisms and establishes a stable, spec-correct foundation for future features.

### 🧠 What Changed
#### ❌ Removed

- SwaggerClient-based validation fallback
- Experimental browser usage of swagger-parser
- Regex-based $ref detection logic
- Mixed validation responsibilities inside UI layer

#### ✅ Introduced

- Ajv v6 validation engine (Draft-04 compatible)
- Official OpenAPI 3.0 schema validation
- Locally vendored Draft-04 meta schema
- Unified validateOpenApiSpec() pipeline
- Structured validation result model (errors[], warnings[])
- Cached compiled schema for performance

#### 🎯 Validation Improvements

- Full OpenAPI 3.0 schema compliance checks
- Deterministic behavior across browsers
- Proper Draft-04 meta-schema support
- Clean separation of:
  - YAML parsing
  - Schema validation
  - USS semantic validation
  - Preview rendering
- Preview rendering gated strictly on zero errors
- Monaco markers with precise line-level highlighting

#### 🛡️ Added Semantic Safeguards

- Missing securitySchemes detection
- Invalid server variable validation
- Unresolved internal $ref detection
- External $ref warnings (offline-safe policy)

#### 🏗 Architectural Impact

This refactor establishes:

- A stable browser-only validation core
- GitHub Pages compatibility without Node dependencies
- A foundation for:
  - Strict mode
  - OpenAPI 3.1 support
  - Advanced rule configuration
  - Validation rule extensions

#### 📌 Result

USS validation is now:

- Deterministic
- Spec-correct
- Extensible
- Professional-grade

</details>

<details>

<summary>[1.7.1] AI Gateway Improvements</summary>

## [1.7.1]
### AI Gateway Improvements

- Added authentication-aware AI client with typed AiAuthError
- Implemented request timeout via AbortController
- Added /docs/ai-access documentation page
- Improved sign-in UX with clickable toast
- Conditional credential handling for corporate AI gateway mode
- Strengthened CORS and authentication flow
- Toast library updated to support Node content

</details>

<details>

<summary>[1.6.3] Feature Release - Add LLM (Large Language Model) AI integration to Open API Editor</summary>

## [1.6.3]
### Feature Release
- Add LLM (Large Language Model) AI integration to Open API Editor
- Users can now request an AI to draft an API spec document for them. 
- Users need to ensure that their prompt contains at least a valid API keyword else the request is rejected.
- Keywords include:
    'openapi', 'swagger', 'spec', 'yaml',
        'endpoint', 'endpoints', 'route', 'routes', 'path', 'paths',
        'request', 'response', 'payload', 'body',
        'schema', 'schemas', 'field', 'fields', 'properties',
        'header', 'headers', 'x-request-id', 'x-correlation-id',
        'auth', 'authentication', 'authorize', 'jwt', 'bearer', 'oauth',
        'status code', '200', '400', '401', '404', '500',
        'get ', 'post ', 'put ', 'delete ', 'patch '
- General knowledge questions are also not allowed
- Typical errors for non API related queries:
  - This looks like a general question. Please describe an API you want to generate (endpoints/routes, request/response fields, headers, auth).
  - Prompt does not mention API design concepts (endpoints, request/response, schemas, headers, auth).
- Caters for corporates to provide their own AI gateways.

</details>

<details>

<summary>All previous releases</summary>

## [v1.5.2] - 2026-02-18
### Enhancements
- Add localised CDN's and pin to specific versions
- Update logic to check if CDN is available, if not use local.
- Update branding

## [v1.0.2] - 2025-12-18
## Schema Export Architecture

- openapiEditor.js: orchestration only
- schemaExportModal.js: modal lifecycle
- selectionUtils.js: selection state
- dependencyResolver.js: dependency graph
- exporters: markdown / confluence

Refactored via multi-pass extraction to avoid regressions.

## [v1.0.1] - 2025-10-25
### Build Enhancements
- Implement cache-busting tech to bypass Redoc caching
- Implement auto build incrementation
- Implement auto-increment of cache-busting refresh
- Add build-info.json
- Add buildVersion.js
- Update deployment logic in docs.yml

## [1.0.0] – 2025-10-25
### 🎨 UI / Theme Enhancements
- Implemented **Monaco Editor theme dropdown** with persistent selection (`vs`, `vs-dark`, `hc-black`).
- Added automatic theme initialization based on system preference, with localStorage retention.
- Introduced **dynamic `data-theme` support** for future light/dark synchronization.
- Ensured seamless background blending between Monaco and surrounding `#yamlEditor` container.

### 🧱 ReDoc Styling Refinements
- Reworked dark-mode overrides for ReDoc within `#previewPane`:
  - Neutral dark background (`#121212`) for better contrast.
  - Unified white text for headings, labels, and inline spans.
  - Sidebar, tables, and code blocks now align with Monaco’s tone.
- Added scoped link coloring and hover states (`#61affe → #80bfff`).
- Improved operation badges (GET, POST, PUT, DELETE) with distinct colors.
- Fixed readability issues in ReDoc schema cards (`sc-ikkxIA`) and inner property tables.
- Added styling for ReDoc’s nested elements, including:
  - **Tabs** (Payload / Example)
  - **Labels** (e.g., *Status Confirmations*)
  - **Schema cards** (OneOf / AnyOf sections)

### ❤️ Readability & Badge Fixes
- Restored **red “required” labels** in schema views:
  - Targets `div.sc-Nxspf.sc-hRJfrW.lmPAIU.dBPdaM` and related classes.
  - Uses precise, high-specificity selectors to override ReDoc’s internal white text.
- Unified other badges (like *string*, *any*, *additional property*) under consistent dark-mode readability.
- Preserved ReDoc’s spacing, font-size, and structure for compatibility with future versions.

### 🧭 Toolbar & Layout Improvements
- Added “Theme” selector to the toolbar beside Export buttons.
- Styled dropdown to match dark and light themes seamlessly.
- Verified responsive resizing between Monaco and ReDoc panels using `#dragbar`.

### ✅ Stability / UX
- Validated no flicker or color mismatch during theme transitions.
- Confirmed consistent look and feel across all Monaco themes.
- Clean separation between editor, preview, and lint components.

---

### 🏷️ Notes
This release marks the **first stable UI version** of the OpenAPI Editor with fully integrated Monaco + ReDoc theming.  
Future iterations may include synchronized light/dark switching for ReDoc and subtle hover animations for schema elements.

</details>

